const mongoose = require('mongoose');

const experimentWalletSchema = new mongoose.Schema({
    experimentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Experiment',
        required: true,
        unique: true,
    },
    currency: {
        type: String,
        default: 'LKR',
    },
    balance: {
        type: Number,
        default: 0,
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

const { db } = require("../config/db");
const ExperimentWallet = db.model("ExperimentWallet", experimentWalletSchema);

module.exports = ExperimentWallet;
