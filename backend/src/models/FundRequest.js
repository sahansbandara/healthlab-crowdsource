const mongoose = require('mongoose');

const fundRequestSchema = new mongoose.Schema({
    experimentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment',
        required: true,
    },
    researcherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OPEN_FOR_FUNDING', 'CLOSED', 'FUNDED'],
        default: 'DRAFT',
    },
    isOpenForFunding: {
        type: Boolean,
        default: false,
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    raisedAmount: {
        type: Number,
        default: 0,
    },
    reason: {
        type: String,
        required: true,
    },
    adminDecisionNote: {
        type: String,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // Timestamps for status changes
    submittedAt: Date,
    reviewedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    fundedAt: Date,
    closedAt: Date,
}, {
    timestamps: true
});

const { db } = require("../config/db");
module.exports = db.model("FundRequest", fundRequestSchema);
