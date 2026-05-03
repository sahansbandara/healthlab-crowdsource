// Admin service: business logic for researchers, users, experiments. No HTTP here.
const User = require("../models/User");
const Researcher = require("../models/Researcher");
const Experiment = require("../models/Experiment");
const FundRequest = require("../models/FundRequest");
const ExperimentWallet = require("../models/ExperimentWallet");
const Contribution = require("../models/Contribution");
const { RESEARCHER_STATUS, USER_ROLE } = require("../config/constants");
const { RESEARCHER_TYPES } = require("../models/Researcher");

const POPULATE_USER = "name email role";
const POPULATE_REVIEWED_BY = "name email";
const RESEARCHER_ID_PREFIX = "RES";
const RESEARCHER_ID_WIDTH = 3;

function parseResearcherIdSequence(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^RES?(\d+)$/i);
  if (!match) return null;
  const seq = Number.parseInt(match[1], 10);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

function formatResearcherId(sequence) {
  return `${RESEARCHER_ID_PREFIX}${String(sequence).padStart(RESEARCHER_ID_WIDTH, "0")}`;
}

async function getCurrentMaxResearcherSequence() {
  const rows = await Researcher.find({ researcherId: { $exists: true, $ne: null } })
    .select("researcherId")
    .lean();
  return rows.reduce((max, row) => {
    const seq = parseResearcherIdSequence(row?.researcherId);
    return seq && seq > max ? seq : max;
  }, 0);
}

async function assignMissingApprovedResearcherIds() {
  const approvedWithoutIds = await Researcher.find({
    status: RESEARCHER_STATUS.APPROVED,
    $or: [
      { researcherId: { $exists: false } },
      { researcherId: null },
      { researcherId: "" },
    ],
  })
    .sort({ reviewedAt: 1, createdAt: 1, _id: 1 })
    .select("_id")
    .lean();

  if (approvedWithoutIds.length === 0) return;

  let nextSequence = (await getCurrentMaxResearcherSequence()) + 1;
  const operations = approvedWithoutIds.map((row) => {
    const researcherId = formatResearcherId(nextSequence);
    nextSequence += 1;
    return {
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { researcherId } },
      },
    };
  });

  await Researcher.bulkWrite(operations);
}

async function ensureApprovedResearcherIds() {
  await assignMissingApprovedResearcherIds();
}

// Fetch one researcher with user and reviewedBy populated
async function findResearcherById(id) {
  return Researcher.findById(id)
    .populate("user", POPULATE_USER)
    .populate("reviewedBy", POPULATE_REVIEWED_BY);
}

// Set researcher status (approved/rejected), reviewNotes, reviewedAt, reviewedBy; only if still pending
async function updateResearcherReview(researcherId, { status, reviewNotes }, reviewedByUserId) {
  const researcher = await Researcher.findById(researcherId);
  if (!researcher) return null;
  if (researcher.status !== RESEARCHER_STATUS.PENDING) {
    const err = new Error("Researcher has already been reviewed");
    err.statusCode = 400;
    throw err;
  }
  researcher.status = status;
  researcher.reviewNotes = reviewNotes != null ? String(reviewNotes) : "";
  researcher.reviewedAt = new Date();
  researcher.reviewedBy = reviewedByUserId;

  await researcher.save();

  if (status === RESEARCHER_STATUS.APPROVED) {
    await assignMissingApprovedResearcherIds();
  }

  return findResearcherById(researcherId);
}

// List users with optional role filter; attach researcher status when user is a researcher
async function findResearcherByUserId(userId) {
  return Researcher.findOne({ user: userId })
    .populate("user", POPULATE_USER)
    .populate("reviewedBy", POPULATE_REVIEWED_BY);
}
async function getUsersWithResearcherStatus(roleFilter = null) {
  const filter = roleFilter ? { role: roleFilter } : {};
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  const userIds = users.map((u) => u._id);
  const researchers = await Researcher.find({ user: { $in: userIds } });
  const researcherByUser = new Map(researchers.map((r) => [r.user.toString(), r]));
  const mappedUsers = users.map((u) => {
    const uObj = u.toObject();
    const r = researcherByUser.get(u._id.toString());
    if (r) {
      uObj.researcherStatus = r.status;
      uObj.researcherId = r.researcherId || null;
    }
    return uObj;
  });

  mappedUsers.sort((a, b) => {
    const aAdmin = String(a.role || "").toLowerCase() === USER_ROLE.ADMIN ? 1 : 0;
    const bAdmin = String(b.role || "").toLowerCase() === USER_ROLE.ADMIN ? 1 : 0;
    if (aAdmin !== bAdmin) return bAdmin - aAdmin;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return mappedUsers;
}

// Delete experiment and related data; optionally reject creator as researcher and/or set role to participant
async function deleteExperimentWithOptions(experimentId, options, adminUserId) {
  const { rejectResearcher: doReject, reassignToParticipant: doReassign } = options || {};
  const experiment = await Experiment.findById(experimentId);
  if (!experiment) return null;
  const createdBy = experiment.createdBy || experiment.ownerId;

  await Promise.all([
    Experiment.findByIdAndDelete(experimentId),
    ExperimentWallet.findOneAndDelete({ experimentId }),
    FundRequest.deleteMany({ experimentId }),
    Contribution.deleteMany({ experimentId }),
  ]);

  if (createdBy && (doReject || doReassign)) {
    const researcher = await Researcher.findOne({ user: createdBy });
    if (researcher && doReject) {
      researcher.status = RESEARCHER_STATUS.REJECTED;
      researcher.reviewNotes = (researcher.reviewNotes || "") + " [Rejected due to experiment policy violation - experiment deleted by admin]";
      researcher.reviewedAt = new Date();
      researcher.reviewedBy = adminUserId;
      await researcher.save();
    }
    if (doReassign) {
      await User.findByIdAndUpdate(createdBy, { role: USER_ROLE.PARTICIPANT });
    }
  }
  return true;
}

// Counts by status, type, and overdue pending (older than overdueDays)
async function getResearcherAnalytics(overdueDays = 7) {
  const cutoff = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);
  const [totalResearchers, pendingCount, approvedCount, rejectedCount, byTypeResult, overdueCount] = await Promise.all([
    Researcher.countDocuments(),
    Researcher.countDocuments({ status: RESEARCHER_STATUS.PENDING }),
    Researcher.countDocuments({ status: RESEARCHER_STATUS.APPROVED }),
    Researcher.countDocuments({ status: RESEARCHER_STATUS.REJECTED }),
    Researcher.aggregate([
      { $group: { _id: "$researcherType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Researcher.countDocuments({ status: RESEARCHER_STATUS.PENDING, createdAt: { $lt: cutoff } }),
  ]);

  const byStatus = { pending: pendingCount, approved: approvedCount, rejected: rejectedCount };
  const researcherTypeDistribution = {};
  RESEARCHER_TYPES.forEach((t) => (researcherTypeDistribution[t] = 0));
  byTypeResult.forEach((row) => (researcherTypeDistribution[row._id] = row.count));

  return {
    totalResearchers,
    byStatus,
    researcherTypeDistribution,
    pendingBacklogCount: pendingCount,
    overduePendingCount: overdueCount,
    overdueDays,
  };
}

module.exports = {
  findResearcherById,
  findResearcherByUserId,
  updateResearcherReview,
  ensureApprovedResearcherIds,
  getUsersWithResearcherStatus,
  deleteExperimentWithOptions,
  getResearcherAnalytics,
  RESEARCHER_STATUS,
};
