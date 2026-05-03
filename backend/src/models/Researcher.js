const mongoose = require("mongoose");

const RESEARCHER_TYPES = ["Student", "NGO", "Affiliated to Organization", "Other"];

const researcherSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true, trim: true },
    nic: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    currentWorkplace: { type: String, required: true, trim: true },
    highestAcademicQualification: { type: String, required: true, trim: true },
    researcherType: {
      type: String,
      required: true,
      enum: RESEARCHER_TYPES,
    },
    // Required when researcherType === "Affiliated to Organization"
    affiliationProof: { type: String, trim: true, default: null },
    // Required when researcherType === "Other"
    otherResearcherTypeExplanation: { type: String, trim: true, default: null },
    // Yes/No: has previously published research
    hasPublishedResearch: { type: Boolean, required: true },
    // Required when hasPublishedResearch === true
    publicationSiteOrLink: { type: String, trim: true, default: null },
    // Need and purpose of research (always available; especially for those without prior experience)
    purpose: { type: String, required: true, trim: true },
    // Admin review: Pending (default for new registrations), Approved, or Rejected
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Set when admin approves or rejects
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, trim: true, default: "" },
    researcherId: { type: String, unique: true, sparse: true }, // e.g., RES001
    isFlagged: { type: Boolean, default: false },
    flags: [
      {
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

const { db } = require("../config/db");
module.exports = db.model("Researcher", researcherSchema);
module.exports.RESEARCHER_TYPES = RESEARCHER_TYPES;
