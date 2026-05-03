const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // Core fields used by the frontend Research Reviews UI
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Legacy / optional fields kept for backward compatibility
    abstract: {
      type: String,
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator(v) {
          return v.every((k) => typeof k === "string" && k.length <= 50);
        },
        message: "Keywords must be strings, max 50 chars each",
      },
    },
    experiment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experiment",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "reviews" }
);

// Set publishedAt when status becomes published
reviewSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

const { db } = require("../config/db");
module.exports = db.model("Review", reviewSchema);
