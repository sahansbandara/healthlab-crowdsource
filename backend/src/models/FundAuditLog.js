const mongoose = require('mongoose');

const fundAuditLogSchema = new mongoose.Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Could be system action? Though usually a user.
    },
    actorRole: {
        type: String,
    },
    action: {
        type: String,
        required: true,
        // enum: ['CREATE_REQUEST', 'UPDATE_REQUEST', 'CANCEL_REQUEST', 'REVIEW_STATUS_CHANGE', 'CONTRIBUTION_CREATED', 'CONTRIBUTION_SUCCESS', 'WALLET_CREDIT']
    },
    fundRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FundRequest',
    },
    experimentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment',
    },
    fromStatus: String,
    toStatus: String,
    metadata: {
        type: Object, // Store JSON details
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

const { db } = require("../config/db");
module.exports = db.model("FundAuditLog", fundAuditLogSchema);
