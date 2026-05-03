const mongoose = require("mongoose");
const { db } = require("../config/db");

const participationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userAge: { type: Number, required: true },
    userEmail: { type: String, required: true },
    experimentId: { type: mongoose.Schema.Types.ObjectId, ref: "Experiment", required: true },
    status: {
      type: String,
      enum: ["joined", "dropped", "completed"],
      default: "joined",
    },
    dateJoined: { type: Date, default: Date.now },
    dateLeft: { type: Date, default: null },
    isAnonymized: { type: Boolean, default: false },
    logs: [
      {
        date: { type: String, required: true }, // Format: YYYY-MM-DD
        data: { type: Map, of: mongoose.Schema.Types.Mixed }, // Store dynamic log fields
        submittedAt: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

participationSchema.index({ userId: 1, experimentId: 1 }, { unique: true });

module.exports = db.model("Participation", participationSchema);
