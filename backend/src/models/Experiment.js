const mongoose = require("mongoose");

const eligibilityCriteriaSchema = new mongoose.Schema(
  {
    minAge: { type: Number, min: 0 },
    maxAge: { type: Number, min: 0 },
    genders: [{ type: String, trim: true }],
    requiredConditions: [{ type: String, trim: true }],
    excludedConditions: [{ type: String, trim: true }],
    minBMI: { type: Number },
    maxBMI: { type: Number },
    requiredHabits: [{ type: String, trim: true }],
    excludedHabits: [{ type: String, trim: true }],
  },
  { _id: false }
);

const logFieldDefinitionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true }, // fieldId
    type: {
      type: String,
      required: true,
      enum: ["number", "text", "boolean", "date", "time", "select", "multi-select"],
    },
    required: { type: Boolean, default: false },
    unit: { type: String, trim: true },
    min: { type: Number },
    max: { type: Number },
    options: [{ type: String, trim: true }], // only for select/multi-select
    frequency: { type: String, enum: ["daily", "weekly", "once"] },
    helpText: { type: String, trim: true },
  },
  { _id: false }
);


const experimentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, default: "draft" },

    // Keep for backward compatibility
    eligibilityRules: { type: Object, default: {} },

    // ✅ New structured eligibility criteria
    eligibilityCriteria: {
      type: eligibilityCriteriaSchema,
      default: undefined, // only store if provided
    },

    participantLimit: { type: Number, default: 0 },
    // ✅ Keep ONE counter only (recommended)
    currentParticipantCount: { type: Number, default: 0 },

    // ✅ Researcher Authorization
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ✅ Metadata tags for discovery and insights
    tags: { type: [String], default: [] },

    // ✅ Associated Exercises for Safety Preview (WGER API)
    associatedExercises: { type: [String], default: [] },

    // ✅ Conflict tags
    conflictTags: { type: [String], default: [] },

    // ✅ Data Collection Fields / Participant Log Template
    logFieldDefinitions: { type: [logFieldDefinitionSchema], default: [] },


    // ✅ Duration / lifecycle
    startDate: { type: Date },
    endDate: { type: Date },
    applicationDeadline: { type: Date },

    // Existing lifecycle fields
    publishedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    // AI-generated summary (Gemini) based on experiment + participant log data
    aiSummary: { type: String, default: "" },
    aiSummaryUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "experiments",
  }
);

experimentSchema.pre("validate", function () {
  const exp = this;
  const criteria = exp.eligibilityCriteria || {};

  if (criteria.minAge != null && criteria.maxAge != null && criteria.maxAge <= criteria.minAge) {
    exp.invalidate("eligibilityCriteria.maxAge", "maxAge must be greater than minAge");
  }

  if (criteria.minBMI != null && criteria.maxBMI != null && criteria.maxBMI <= criteria.minBMI) {
    exp.invalidate("eligibilityCriteria.maxBMI", "maxBMI must be greater than minBMI");
  }

  if (exp.startDate && exp.endDate && exp.endDate <= exp.startDate) {
    exp.invalidate("endDate", "endDate must be greater than startDate");
  }

  if (exp.applicationDeadline && exp.startDate && exp.applicationDeadline > exp.startDate) {
    exp.invalidate(
      "applicationDeadline",
      "applicationDeadline must be before or equal to startDate"
    );
  }
});

// ✅ Prevent OverwriteModelError during nodemon restarts
const { db } = require("../config/db");
const experimentModel =
  db.models.Experiment ||
  db.model("Experiment", experimentSchema);

console.log(
  `📁 Model: 'Experiment' initialized on DB: ${experimentModel.db.name} (Coll: ${experimentModel.collection.name})`
);

module.exports = experimentModel;
