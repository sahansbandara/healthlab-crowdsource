const mongoose = require('mongoose');
const { db } = require('../config/db');

const reportSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'offensive', 'misinformation', 'other'],
      required: true,
    },
    customReason: { type: String, trim: true, default: null },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

// Index on postId for quick lookups
reportSchema.index({ postId: 1 });
reportSchema.index({ reportedBy: 1 });

module.exports = db.models.Report || db.model('Report', reportSchema);
