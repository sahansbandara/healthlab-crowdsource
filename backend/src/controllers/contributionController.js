const contributionService = require('../services/contributionService');

const contribute = async (req, res, next) => {
    try {
        const fundRequestId = req.params.id;
        const { amount, paymentStatus, paymentReferenceId, notes } = req.body;

        const result = await contributionService.contribute(req.user, fundRequestId, { amount, paymentStatus, paymentReferenceId, notes });

        res.status(201).json(result);
    } catch (error) {
        if (error.message.includes('not found')) res.status(404);
        else if (error.message.includes('not currently open')) res.status(400);
        else if (error.message.includes('exceeds remaining amount')) res.status(400);
        else if (error.message.includes('already exists')) res.status(409);
        else res.status(400); // Default to bad request for business logic errors

        next(error);
    }
};

const getMyContributions = async (req, res, next) => {
    try {
        const contributions = await contributionService.getOwnContributions(req.user._id);
        res.json(contributions);
    } catch (error) {
        next(error);
    }
};

const getAllContributions = async (req, res, next) => {
    try {
        const contributions = await contributionService.getAllContributions(req.query);
        res.json(contributions);
    } catch (error) {
        next(error);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const contribution = await contributionService.updateContributionStatus(req.params.id, req.user, req.body);
        res.json(contribution);
    } catch (error) {
        if (error.message.includes('not found')) res.status(404);
        else if (error.message.includes('Already') || error.message.includes('Cannot update') || error.message.includes('required')) res.status(400);
        else res.status(400);
        next(error);
    }
};

const voidContribution = async (req, res, next) => {
    try {
        const { voidReason } = req.body;
        const contribution = await contributionService.voidContribution(req.params.id, req.user, voidReason);
        res.json(contribution);
    } catch (error) {
        if (error.message.includes('not found')) res.status(404);
        else if (error.message.includes('Already voided')) res.status(400);
        else res.status(400);
        next(error);
    }
};

module.exports = {
    contribute,
    getMyContributions,
    getAllContributions,
    updateStatus,
    voidContribution
};
