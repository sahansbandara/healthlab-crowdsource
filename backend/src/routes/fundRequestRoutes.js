const express = require('express');
const { createRequest, getMyRequests, getRequestById, updateRequest, deleteRequest, cancelRequest, getOpenRequests } = require('../controllers/fundRequestController');
const { contribute } = require('../controllers/contributionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public or authenticated donor routes
router.get('/open', getOpenRequests); // Need to attach controller method
router.post('/:id/contribute', protect, authorize('participant', 'researcher', 'admin'), contribute);

router.use(protect); // All routes below are protected

router.post('/', authorize('researcher'), createRequest);
router.get('/my', authorize('researcher'), getMyRequests);
router.get('/:id', authorize('researcher', 'admin'), getRequestById);
router.patch('/:id', authorize('researcher', 'admin'), updateRequest);
router.delete('/:id', authorize('researcher', 'admin'), deleteRequest);

module.exports = router;
