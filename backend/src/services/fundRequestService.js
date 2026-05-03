const FundRequest = require('../models/FundRequest');
const Experiment = require('../models/Experiment');
const ExperimentWallet = require('../models/ExperimentWallet');
const auditService = require('./auditService');
const mongoose = require('mongoose');

// Helper to check for active requests
const calculateAiPrediction = (request) => {
    if (!request.raisedAmount || request.raisedAmount <= 0) return null;
    if (request.raisedAmount >= request.targetAmount) return 0;

    const createdAt = new Date(request.createdAt || request.submittedAt || Date.now());
    const daysSinceCreation = Math.max(0.5, (Date.now() - createdAt) / (1000 * 60 * 60 * 24));

    const dailyRate = request.raisedAmount / daysSinceCreation;
    const remainingAmount = request.targetAmount - request.raisedAmount;

    const estimatedDays = Math.ceil(remainingAmount / dailyRate);
    return estimatedDays;
};

const hasActiveRequest = async (experimentId) => {
    const activeStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];

    const count = await FundRequest.countDocuments({
        experimentId,
        status: { $in: activeStatuses }
    });
    return count > 0;
};

// Helper: Enforce only one fund request per researcher per calendar month
const enforceMonthlyResearcherFundRequestLimit = async (researcherId) => {
    const now = new Date();
    // Using UTC to safely determine start and end of the current month
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const count = await FundRequest.countDocuments({
        researcherId,
        createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
        }
    });

    if (count > 0) {
        const error = new Error('Researcher can create only one fund request per month.');
        error.code = 'MONTHLY_FUND_REQUEST_LIMIT_REACHED';
        throw error;
    }
};

const createRequest = async (user, data) => {
    const { experimentId, targetAmount, reason } = data;

    // 1. Validation
    if (targetAmount <= 0) throw new Error('Target amount must be positive');

    const experiment = await Experiment.findById(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    if (experiment.createdBy && experiment.createdBy.toString() !== user._id.toString()) {
        throw new Error('Not authorized to request funds for this experiment');
    }

    // Check active requests
    if (await hasActiveRequest(experimentId)) {
        throw new Error('An active fund request already exists for this experiment');
    }

    // Check monthly limit
    await enforceMonthlyResearcherFundRequestLimit(user._id);

    // 2. Create
    const request = await FundRequest.create({
        experimentId,
        researcherId: user._id,
        targetAmount,
        reason,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    });

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'CREATE_REQUEST',
        fundRequestId: request._id,
        experimentId,
        toStatus: 'SUBMITTED',
        metadata: { targetAmount }
    });

    return request;
};

const getMyRequests = async (userId) => {
    const requests = await FundRequest.find({ researcherId: userId })
        .sort({ createdAt: -1 })
        .populate('experimentId', 'title');

    return requests.map(req => {
        const doc = req.toObject ? req.toObject() : req;
        return {
            ...doc,
            aiPredictionDays: calculateAiPrediction(req)
        };
    });
};

const getOpenRequests = async () => {
    const requests = await FundRequest.find({ status: 'OPEN_FOR_FUNDING', isOpenForFunding: true })
        .sort({ createdAt: -1 })
        .populate('researcherId', 'name')
        .populate('experimentId', 'title');

    return requests.map(req => {
        const doc = req.toObject ? req.toObject() : req;
        return {
            ...doc,
            aiPredictionDays: calculateAiPrediction(req)
        };
    });
};

const getRequestById = async (requestId, user) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    if (user.role?.toLowerCase() !== 'admin' && request.researcherId.toString() !== user._id.toString()) {
        throw new Error('Not authorized');
    }
    return request;
};

const updateRequest = async (requestId, user, data) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    // Business Rules:
    // 1. If not admin, check ownership
    // 2. If not admin, check status lock (only SUBMITTED/DRAFT allowed)
    if (user.role?.toLowerCase() !== 'admin') {
        if (request.researcherId.toString() !== user._id.toString()) {
            throw new Error('Not authorized: You do not own this fund request');
        }

        if (!['DRAFT', 'SUBMITTED'].includes(request.status)) {
            throw new Error(`Fund request is locked and cannot be modified after approval. Current status: ${request.status}`);
        }
    }

    // Whitelist allowed fields for update
    const allowedFields = ['targetAmount', 'reason', 'description'];
    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            request[field] = data[field];
        }
    });

    // Handle manual submission if status is DRAFT
    if (data.status === 'SUBMITTED' && request.status === 'DRAFT') {
        request.status = 'SUBMITTED';
        request.submittedAt = new Date();
    }

    await request.save();

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'UPDATE_REQUEST',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        metadata: data
    });

    return request;
};

const cancelRequest = async (requestId, user) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    if (request.researcherId.toString() !== user._id.toString()) {
        throw new Error('Not authorized');
    }

    if (!['DRAFT', 'SUBMITTED'].includes(request.status)) {
        throw new Error('Cannot cancel request in current status');
    }

    const oldStatus = request.status;
    request.status = 'CANCELLED';
    request.cancelledAt = new Date();
    await request.save();

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'CANCEL_REQUEST',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        fromStatus: oldStatus,
        toStatus: 'CANCELLED'
    });

    return request;
};

const deleteRequest = async (requestId, user) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    // Business Rules:
    // 1. If not admin, check ownership
    // 2. If not admin, check status lock (only SUBMITTED/DRAFT allowed)
    if (user.role?.toLowerCase() !== 'admin') {
        if (request.researcherId.toString() !== user._id.toString()) {
            throw new Error('Not authorized: You do not own this fund request');
        }

        if (!['DRAFT', 'SUBMITTED'].includes(request.status)) {
            throw new Error(`Fund request is locked and cannot be deleted after approval. Current status: ${request.status}`);
        }
    }

    await FundRequest.findByIdAndDelete(requestId);

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'DELETE_REQUEST',
        fundRequestId: requestId,
        experimentId: request.experimentId,
        metadata: { reason: request.reason, targetAmount: request.targetAmount }
    });

    return { success: true, message: 'Fund request deleted successfully' };
};

// Admin Functions

const getAllRequests = async (filters) => {
    // Filters: status, experimentId, researcherId, date range
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.experimentId) query.experimentId = filters.experimentId;
    if (filters.researcherId) query.researcherId = filters.researcherId;

    const requests = await FundRequest.find(query)
        .sort({ createdAt: -1 })
        .populate('researcherId', 'name email')
        .populate('experimentId', 'title');

    return requests.map(req => {
        const doc = req.toObject ? req.toObject() : req;
        return {
            ...doc,
            experimentTitle: doc.experimentId?.title || 'Unknown Experiment',
            researcherName: doc.researcherId?.name || 'Unknown Researcher',
            researcherEmail: doc.researcherId?.email || '',
            amountRequested: doc.targetAmount || 0,
            aiPredictionDays: calculateAiPrediction(req)
        };
    });
};

const updateStatus = async (requestId, user, { status, adminDecisionNote, approvedAmount }) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    const oldStatus = request.status;
    const s = String(status || '').toUpperCase();
    const allowedStatuses = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OPEN_FOR_FUNDING', 'CLOSED'];

    if (!allowedStatuses.includes(s)) {
        throw new Error(`Invalid status update: ${status}`);
    }

    // Use the uppercase version for logic
    const targetStatus = s;

    // Logic for specific status changes
    let finalStatus = targetStatus;

    if (targetStatus === 'UNDER_REVIEW') {
        if (oldStatus !== 'SUBMITTED') throw new Error('Invalid transition to UNDER_REVIEW');
        request.reviewedAt = new Date();
    } else if (targetStatus === 'REJECTED') {
        request.rejectedAt = new Date();
        request.isOpenForFunding = false;
    } else if (targetStatus === 'APPROVED' || targetStatus === 'OPEN_FOR_FUNDING') {
        // Allow moving to APPROVED/OPEN from either SUBMITTED or UNDER_REVIEW
        if (!['SUBMITTED', 'UNDER_REVIEW'].includes(oldStatus)) {
            throw new Error(`Invalid transition to ${targetStatus}`);
        }

        // If an approved amount is provided, update the target amount
        if (approvedAmount && Number(approvedAmount) > 0) {
            request.targetAmount = Number(approvedAmount);
        }

        // Automatically make it open for funding if approved
        finalStatus = 'OPEN_FOR_FUNDING';
        request.isOpenForFunding = true;
        request.approvedAt = new Date();
        request.approvedBy = user._id;
    } else if (targetStatus === 'CLOSED') {
        request.isOpenForFunding = false;
        request.closedAt = new Date();
    }

    request.status = finalStatus;
    request.adminDecisionNote = adminDecisionNote || request.adminDecisionNote;
    await request.save();

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'REVIEW_STATUS_CHANGE',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        fromStatus: oldStatus,
        toStatus: status,
        metadata: { adminDecisionNote }
    });

    return request;
};

// Removed disburseRequest as wallet logic is moving to contributions

const disburseRequest = async (requestId, user, referenceId) => {
    const request = await FundRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    if (request.status !== 'APPROVED') {
        throw new Error('Request must be APPROVED to disburse');
    }

    if (!referenceId) throw new Error('Disbursement reference ID required');

    const oldStatus = request.status;
    request.status = 'DISBURSED';
    request.disbursedAt = new Date();
    request.disbursementReferenceId = referenceId;

    await request.save();

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'DISBURSEMENT',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        fromStatus: oldStatus,
        toStatus: 'DISBURSED',
        metadata: { referenceId }
    });

    return request;
};

module.exports = {
    createRequest,
    getMyRequests,
    getOpenRequests,
    getRequestById,
    updateRequest,
    deleteRequest,
    cancelRequest,
    getAllRequests,
    updateStatus
};
