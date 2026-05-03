const User = require("../models/User");
const Researcher = require("../models/Researcher");
const bcrypt = require("bcryptjs");

// POST /researchers/register - Researcher registration
const registerResearcher = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      age,
      university,
      researcherType,
      purpose,
      publications = [],
    } = req.body;

    if (!name || !email || !password || age == null || !university || !researcherType || !purpose) {
      return res.status(400).json({
        message:
          "Missing required fields: name, email, password, age, university, researcherType, purpose",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "researcher",
    });

    const researcher = await Researcher.create({
      user: user._id,
      age,
      university,
      researcherType,
      purpose,
      publications: Array.isArray(publications) ? publications : [],
      status: "pending",
    });

    const researcherPopulated = await Researcher.findById(researcher._id).populate("user", "name email role");

    return res.status(201).json({
      message: "Researcher registration submitted for admin review",
      researcher: researcherPopulated,
    });
  } catch (err) {
    next(err);
  }
};

// GET /researchers - List all researchers (for admin)
const getResearchers = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const researchers = await Researcher.find(filter)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json(researchers);
  } catch (err) {
    next(err);
  }
};

// GET /researchers/:id - Get one researcher by id (for admin)
const getResearcherById = async (req, res, next) => {
  try {
    const researcher = await Researcher.findById(req.params.id)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email");
    if (!researcher) {
      return res.status(404).json({ message: "Researcher not found" });
    }
    return res.status(200).json(researcher);
  } catch (err) {
    next(err);
  }
};

// PUT /researchers/:id/review - Admin review (approve/reject)
const reviewResearcher = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;
    const { id } = req.params;

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid or missing status. Use 'approved' or 'rejected'.",
      });
    }

    const researcher = await Researcher.findById(id);
    if (!researcher) {
      return res.status(404).json({ message: "Researcher not found" });
    }
    if (researcher.status !== "pending") {
      return res.status(400).json({
        message: "Researcher has already been reviewed",
      });
    }

    researcher.status = status;
    researcher.reviewNotes = reviewNotes != null ? String(reviewNotes) : "";
    researcher.reviewedAt = new Date();
    researcher.reviewedBy = req.body.reviewedBy || null; // set by auth middleware later
    await researcher.save();

    const updated = await Researcher.findById(id)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email");

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerResearcher,
  getResearchers,
  getResearcherById,
  reviewResearcher,
};
