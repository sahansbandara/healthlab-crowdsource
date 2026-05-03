const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    fundRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FundRequest',
        required: true,
    },
    experimentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment',
        required: true,
    },
    contributorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'VOIDED'],
        default: 'PENDING',
    },
    paymentReferenceId: {
        type: String,
        sparse: true, // Unique index if present, ignores nulls
        unique: true,
    },
    walletCredited: {
        type: Boolean,
        default: false
    },
    creditedAt: {
        type: Date
    },
    notes: {
        type: String,
    },
    isVoided: {
        type: Boolean,
        default: false
    },
    voidReason: {
        type: String
    }
}, {
    timestamps: true
});

const { db } = require("../config/db");
module.exports = db.model("Contribution", contributionSchema);
