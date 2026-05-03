const express = require('express');
const { createPayment, paymentWebhook, getPaymentStatus } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Contribution = require('../models/Contribution');
const FundRequest = require('../models/FundRequest');
const ExperimentWallet = require('../models/ExperimentWallet');

const router = express.Router();

router.post('/create', protect, authorize('participant', 'researcher', 'admin'), createPayment);
router.get('/status/:orderId', protect, getPaymentStatus);
router.get('/verify-stripe/:sessionId', protect, require('../controllers/paymentController').verifyStripePayment);
router.post('/webhook', paymentWebhook);

// DEV ONLY: Manually confirm a payment (simulates Stripe webhook for localhost testing)
router.post('/dev-confirm/:orderId', protect, async (req, res) => {
    try {
        const contribution = await Contribution.findOne({ paymentReferenceId: req.params.orderId });
        if (!contribution) return res.status(404).json({ message: 'Contribution not found.' });
        if (contribution.paymentStatus === 'SUCCESS') return res.json({ message: 'Already confirmed.', contribution });

        contribution.paymentStatus = 'SUCCESS';
        contribution.walletCredited = true;
        contribution.creditedAt = new Date();
        await contribution.save();

        const fundRequest = await FundRequest.findById(contribution.fundRequestId);
        if (fundRequest) {
            fundRequest.raisedAmount += contribution.amount;
            if (fundRequest.raisedAmount >= fundRequest.targetAmount) {
                fundRequest.status = 'FUNDED';
                fundRequest.isOpenForFunding = false;
                fundRequest.fundedAt = new Date();
            }
            await fundRequest.save();
        }

        let wallet = await ExperimentWallet.findOne({ experimentId: contribution.experimentId });
        if (!wallet) {
            wallet = await ExperimentWallet.create({ experimentId: contribution.experimentId, balance: 0 });
        }
        wallet.balance += contribution.amount;
        wallet.lastUpdatedAt = new Date();
        await wallet.save();

        console.log(`✅ DEV: Manually confirmed payment ${req.params.orderId} (LKR ${contribution.amount})`);
        res.json({ message: 'Payment confirmed (dev mode).', contribution });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;