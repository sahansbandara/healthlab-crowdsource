const Contribution = require('../models/Contribution');
const FundRequest = require('../models/FundRequest');
const ExperimentWallet = require('../models/ExperimentWallet');
const auditService = require('./auditService');
const mongoose = require('mongoose');

const contribute = async (user, fundRequestId, { amount, notes }) => {
    // 1. Validation
    if (amount <= 0) throw new Error('Contribution amount must be positive');

    // PayHere Force: Always start as PENDING
    const paymentStatus = 'PENDING';

    const request = await FundRequest.findById(fundRequestId);
    if (!request) throw new Error('Fund request not found');

    if (request.status !== 'OPEN_FOR_FUNDING' || !request.isOpenForFunding) {
        throw new Error('This fund request is not currently open for funding.');
    }

    // Check if idempotent / duplicate reference
    if (paymentReferenceId) {
        const existing = await Contribution.findOne({ paymentReferenceId });
        if (existing) {
            throw new Error('A contribution with this payment reference already exists.');
        }
    }

    // Prevent over-funding (if requested)
    if (paymentStatus === 'SUCCESS' && request.raisedAmount + amount > request.targetAmount) {
        throw new Error(`Contribution exceeds remaining amount. Remaining: ${request.targetAmount - request.raisedAmount}`);
    }

    // 2. Create the Contribution
    const contribution = await Contribution.create({
        fundRequestId: request._id,
        experimentId: request.experimentId,
        contributorUserId: user._id,
        amount,
        paymentStatus,
        paymentReferenceId,
        notes,
        walletCredited: false
    });

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'CONTRIBUTION_CREATED',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        metadata: { contributionId: contribution._id, amount, paymentStatus }
    });

    // 3. Process SUCCESS logic
    let walletBalance = null;
    if (paymentStatus === 'SUCCESS') {
        const result = await processContributionSuccess(contribution, request, user);
        walletBalance = result.walletBalance;
    }

    return {
        contribution,
        walletBalance: walletBalance,
        raisedAmount: request.raisedAmount,
        targetAmount: request.targetAmount,
        remainingAmount: request.targetAmount - request.raisedAmount,
        requestStatus: request.status
    };
};

const processContributionSuccess = async (contribution, request, actor) => {
    if (contribution.walletCredited) return; // Idempotent check

    contribution.paymentStatus = 'SUCCESS';
    contribution.walletCredited = true;
    contribution.creditedAt = new Date();
    await contribution.save();

    request.raisedAmount += contribution.amount;

    const oldStatus = request.status;
    let newStatus = oldStatus;
    if (request.raisedAmount >= request.targetAmount) {
        request.status = 'FUNDED';
        request.isOpenForFunding = false;
        request.fundedAt = new Date();
        newStatus = 'FUNDED';
    }
    await request.save();

    let wallet = await ExperimentWallet.findOne({ experimentId: request.experimentId });
    if (!wallet) {
        wallet = await ExperimentWallet.create({ experimentId: request.experimentId, balance: 0 });
    }

    wallet.balance += contribution.amount;
    wallet.lastUpdatedAt = new Date();
    await wallet.save();

    await auditService.logAction({
        actorId: actor._id,
        actorRole: actor.role,
        action: 'CONTRIBUTION_SUCCESS',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        metadata: { contributionId: contribution._id, amount: contribution.amount, paymentReferenceId: contribution.paymentReferenceId }
    });

    await auditService.logAction({
        actorId: actor._id,
        actorRole: 'SYSTEM',
        action: 'WALLET_CREDIT',
        fundRequestId: request._id,
        experimentId: request.experimentId,
        metadata: { contributionId: contribution._id, creditedAmount: contribution.amount, newBalance: wallet.balance }
    });

    if (newStatus === 'FUNDED') {
        await auditService.logAction({
            actorId: actor._id,
            actorRole: 'SYSTEM',
            action: 'REVIEW_STATUS_CHANGE',
            fundRequestId: request._id,
            experimentId: request.experimentId,
            fromStatus: oldStatus,
            toStatus: newStatus,
            metadata: { reason: 'Funding Target Reached' }
        });
    }

    return { walletBalance: wallet.balance };
};

const getOwnContributions = async (userId) => {
    return await Contribution.find({ contributorUserId: userId })
        .sort({ createdAt: -1 })
        .populate('fundRequestId', 'reason targetAmount raisedAmount status');
};

const getAllContributions = async (filters) => {
    const query = {};
    // Add filters if passed
    if (filters && filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    return await Contribution.find(query)
        .sort({ createdAt: -1 })
        .populate('contributorUserId', 'name email')
        .populate('fundRequestId', 'reason targetAmount raisedAmount status')
        .populate('experimentId', 'title');
};

const updateContributionStatus = async (contributionId, user, { paymentStatus, paymentReferenceId }) => {
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) throw new Error('Contribution not found');
    if (contribution.isVoided) throw new Error('Cannot update a voided contribution');

    const oldStatus = contribution.paymentStatus;
    if (oldStatus === 'SUCCESS') {
        throw new Error('Contribution is already processing as SUCCESS');
    }

    contribution.paymentStatus = paymentStatus;
    if (paymentReferenceId) {
        contribution.paymentReferenceId = paymentReferenceId;
    }

    if (paymentStatus === 'SUCCESS') {
        throw new Error('Manual SUCCESS status is blocked. Payments must be confirmed via PayHere webhook.');
    } else {
        await contribution.save();
    }

    return contribution;
};

const voidContribution = async (contributionId, user, voidReason) => {
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) throw new Error('Contribution not found');

    if (contribution.isVoided) throw new Error('Already voided');

    contribution.isVoided = true;
    contribution.paymentStatus = 'VOIDED';
    contribution.voidReason = voidReason || 'Voided by admin';
    await contribution.save();

    await auditService.logAction({
        actorId: user._id,
        actorRole: user.role,
        action: 'CONTRIBUTION_VOIDED',
        fundRequestId: contribution.fundRequestId,
        experimentId: contribution.experimentId,
        metadata: { contributionId: contribution._id, voidReason }
    });

    // Note: Rollback of wallet is explicitly omitted per prompt instructions "do NOT auto-rollback unless explicitly implemented"

    return contribution;
};

module.exports = {
    contribute,
    getOwnContributions,
    getAllContributions,
    updateContributionStatus,
    voidContribution
};
