const Experiment = require('../models/Experiment');
const ExperimentWallet = require('../models/ExperimentWallet');
const {
    pickAllowedCreateFields,
} = require("../validators/experimentValidators");

const createExperiment = async (userId, data) => {
    const payload = pickAllowedCreateFields(data || {});

    const experiment = await Experiment.create({
        ownerId: userId,
        ...payload,
    });

    // Create wallet automatically
    await ExperimentWallet.create({
        experimentId: experiment._id,
        currency: experiment.currency,
        balance: 0,
    });

    return experiment;
};

const getExperimentWallet = async (experimentId, userId, userRole) => {
    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
        throw new Error('Experiment not found');
    }

    // Check ownership if not admin
    if (userRole?.toLowerCase() !== 'admin' && experiment.ownerId?.toString() !== userId.toString()) {
        throw new Error('Not authorized to view this wallet');
    }

    const wallet = await ExperimentWallet.findOne({ experimentId });
    return wallet;
};

module.exports = { createExperiment, getExperimentWallet };
