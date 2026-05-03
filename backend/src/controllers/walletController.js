const experimentService = require('../services/experimentService');

const getWallet = async (req, res, next) => {
    try {
        const { experimentId } = req.params;
        const wallet = await experimentService.getExperimentWallet(experimentId, req.user._id, req.user.role);
        res.json(wallet);
    } catch (error) {
        if (error.message.includes('Not authorized')) {
            res.status(403);
        } else if (error.message.includes('not found')) {
            res.status(404);
        }
        next(error);
    }
};

module.exports = { getWallet };
