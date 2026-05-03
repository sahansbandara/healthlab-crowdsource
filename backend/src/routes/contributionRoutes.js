const express = require('express');
const { getMyContributions, getAllContributions, updateStatus, voidContribution } = require('../controllers/contributionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// User/Donor routes
router.get('/my', authorize('participant', 'researcher', 'admin'), getMyContributions);

// Admin / System routes
router.get('/admin', authorize('admin'), getAllContributions);
router.patch('/:id/status', authorize('admin'), updateStatus);
router.delete('/:id', authorize('admin'), voidContribution);

module.exports = router;
