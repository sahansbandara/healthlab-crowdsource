const Participation = require("../models/Participation");
const Experiment = require("../models/Experiment");
const eligibilityService = require("../services/eligibilityService");
const {
  IneligibleAgeError,
  InvalidMedicalTermError,
  ConflictingStudyError,
  DuplicateParticipationError,
} = require("../errors/CustomErrors");

// POST /participations/join - Join an experiment (with Eligibility Engine + Cohort Management)
const joinExperiment = async (req, res, next) => {
  try {
    const { experimentId } = req.body;

    // Get user from auth middleware (req.user is set by protect/extractUserFromHeader)
    const currentUser = req.user;

    if (!currentUser || !currentUser._id) {
      return res.status(401).json({ message: "You must be logged in to join an experiment." });
    }

    if (!experimentId) {
      return res.status(400).json({ message: "Missing required field: experimentId" });
    }

    const userId = currentUser._id;
    const userAge = currentUser.age;
    const userEmail = currentUser.email;

    // PART B.1: COHORT MANAGEMENT - Atomic seat reservation
    // Standardizing on 'currentParticipantCount' as per Experiment model
    const seatReservedExperiment = await Experiment.findOneAndUpdate(
      {
        _id: experimentId,
        $or: [
          { participantLimit: { $exists: false } },
          { participantLimit: 0 },
          { $expr: { $lt: ["$currentParticipantCount", "$participantLimit"] } },
        ],
      },
      { $inc: { currentParticipantCount: 1 } },
      { new: true }
    );

    if (!seatReservedExperiment) {
      return res.status(409).json({
        error: "CohortFull",
        message: "This study has reached its participant limit.",
      });
    }

    // 1. DUPLICATE PREVENTION: Check if user already joined this experiment
    const existingParticipation = await Participation.findOne({
      userId,
      experimentId,
    });

    if (existingParticipation) {
      // rollback reserved seat since they already joined
      await Experiment.findByIdAndUpdate(experimentId, { $inc: { currentParticipantCount: -1 } });
      throw new DuplicateParticipationError();
    }

    // 2. ELIGIBILITY ENGINE: Run all validation checks
    try {
      await eligibilityService.runEligibilityCheck(currentUser, experimentId);
    } catch (eligibilityErr) {
      // rollback reserved seat if eligibility fails
      await Experiment.findByIdAndUpdate(experimentId, { $inc: { currentParticipantCount: -1 } });
      throw eligibilityErr;
    }

    // 3. CREATION: Create new participation record if all checks pass
    let participation;
    try {
      participation = await Participation.create({
        userId,
        userAge: userAge || 0, // Fallback if age not set
        userEmail,
        experimentId,
        status: "joined",
        dateJoined: new Date(),
        isAnonymized: false,
      });
    } catch (createErr) {
      // rollback reserved seat if record creation fails
      await Experiment.findByIdAndUpdate(experimentId, { $inc: { currentParticipantCount: -1 } });
      throw createErr;
    }

    return res.status(201).json({
      message: "Successfully joined the experiment!",
      participation,
    });
  } catch (err) {
    console.error("Join Experiment Error:", err);

    // Handle specific business logic errors
    const statusCode = err.statusCode || 400;

    return res.status(statusCode).json({
      error: err.name || "JoinError",
      message: err.message,
      ...(err.conflictingStudies && { conflictingStudies: err.conflictingStudies }),
      ...(err.reason && { reason: err.reason }),
      ...(err.explanation && { explanation: err.explanation })
    });
  }
};


/**
 * GET /participations/preview-analysis/:experimentId
 * Pre-enrollment clinical insight report
 */
const getPreJoinAnalysis = async (req, res, next) => {
  console.log(`🔍 [Preview Analysis] Hit for Experiment: ${req.params.experimentId}`);
  try {
    const { experimentId } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const report = await eligibilityService.analyzeProtocolBenefits(currentUser, experimentId);

    return res.status(200).json(report);
  } catch (err) {
    next(err);
  }
};

// GET /participations/my-studies - Get all studies for logged-in user (with Populate)
const getMyStudies = async (req, res, next) => {
  try {
    // Get userId from authenticated user (req.user is set by auth middleware)
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // DATA RETRIEVAL: Find all participations for this user
    const myStudies = await Participation.find({ userId }).sort({ dateJoined: -1 });

    // MANUAL POPULATE: Across different database connections
    const enrichedStudies = await Promise.all(myStudies.map(async (p) => {
      const pObj = p.toJSON();
      const experiment = await Experiment.findById(p.experimentId).select("title description status eligibilityRules");
      pObj.experimentId = experiment;
      return pObj;
    }));

    return res.status(200).json({
      totalStudies: enrichedStudies.length,
      studies: enrichedStudies,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /participations/:participationId/leave - Leave a study (Hard Delete / Unenroll)
const leaveExperiment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // 1. Find the participation record and ensure it belongs to the user
    const participation = await Participation.findOne({ _id: id, userId });

    if (!participation) {
      return res.status(404).json({ message: "Participation record not found or access denied." });
    }

    // 2. Decrement the experiment's currentParticipantCount
    await Experiment.findByIdAndUpdate(participation.experimentId, { $inc: { currentParticipantCount: -1 } });

    // 3. HARD DELETE: Remove the participation record and all its logs
    await Participation.findByIdAndDelete(id);

    return res.status(200).json({
      message: "You have successfully left the study and all your data has been removed.",
    });
  } catch (err) {
    next(err);
  }
};

// GET /participations/:id - Get specific participation detail with experiment info
const getParticipationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const participation = await Participation.findOne({ _id: id, userId });

    if (!participation) {
      return res.status(404).json({ message: "Participation not found or access denied." });
    }

    // Populate experiment details manually (across DBs)
    const participationObj = participation.toJSON();
    const experiment = await Experiment.findById(participation.experimentId)
      .select("title description status logFieldDefinitions publishedAt startDate endDate");

    participationObj.experimentId = experiment;

    return res.status(200).json(participationObj);
  } catch (err) {
    next(err);
  }
};

// POST /participations/:id/logs - Submit a daily log entry
const submitDailyLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { logData } = req.body;
    const userId = req.user._id;

    // 1. Find the participation
    const participation = await Participation.findOne({ _id: id, userId });

    if (!participation) {
      return res.status(404).json({ message: "Participation not found." });
    }

    // 2. Frequency Control - Support Updating today's log until midnight
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const existingLogIndex = participation.logs.findIndex(log => log.date === today);

    if (existingLogIndex !== -1) {
      // Update existing log
      participation.logs[existingLogIndex].data = logData;
      participation.logs[existingLogIndex].submittedAt = new Date();
    } else {
      // Add new log entry
      participation.logs.push({
        date: today,
        data: logData,
        submittedAt: new Date()
      });
    }

    await participation.save();

    return res.status(201).json({
      message: "Daily log submitted successfully!",
      participation
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/participations/:id/logs/today
 * Deletes today's log entry
 */
const deleteDailyLog = async (req, res, next) => {
  try {
    const participationId = req.params.id;
    const userId = req.user._id;

    const participation = await Participation.findOne({ _id: participationId, userId });

    if (!participation) {
      return res.status(404).json({ message: "Participation not found." });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const initialLength = participation.logs.length;
    participation.logs = participation.logs.filter(log => log.date !== today);

    if (participation.logs.length === initialLength) {
      return res.status(404).json({ message: "No log entry found for today to delete." });
    }

    await participation.save();

    res.status(200).json({
      message: "Today's log entry has been deleted.",
      logs: participation.logs
    });
  } catch (err) {
    next(err);
  }
};

// GET /participations/experiment/:experimentId/participants - Get participants list (Researcher only)
const getParticipantsList = async (req, res, next) => {
  try {
    const { experimentId } = req.params;
    const { includeWithdrawn } = req.query;

    const query = { experimentId };

    if (includeWithdrawn !== "true") {
      query.status = "joined";
    }

    const participants = await Participation.find(query)
      .select("-userEmail -userId")
      .populate("experimentId", "title")
      .sort({ dateJoined: -1 });

    const stats = {
      totalJoined: await Participation.countDocuments({ experimentId, status: "joined" }),
      totalDropped: await Participation.countDocuments({ experimentId, status: "dropped" }),
      totalCompleted: await Participation.countDocuments({ experimentId, status: "completed" }),
    };

    return res.status(200).json({
      stats,
      participants: participants.map(p => ({
        _id: p._id,
        experimentTitle: p.experimentId.title,
        status: p.status,
        dateJoined: p.dateJoined,
        dateLeft: p.dateLeft,
        isAnonymized: p.isAnonymized,
        age: p.userAge,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  joinExperiment,
  getMyStudies,
  leaveExperiment,
  getParticipantsList,
  getParticipationDetail,
  submitDailyLog,
  deleteDailyLog,
  getPreJoinAnalysis,
};
