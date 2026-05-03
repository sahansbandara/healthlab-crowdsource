const { body, validationResult } = require('express-validator');

// Validation rules for submitting a report
const reportRules = () => [
  body('reason')
    .isIn(['spam', 'inappropriate', 'offensive', 'misinformation', 'other'])
    .withMessage('Invalid reason. Must be one of: spam, inappropriate, offensive, misinformation, other'),
  body('customReason')
    .custom((value, { req }) => {
      // Only validate if reason is 'other'
      if (req.body.reason === 'other') {
        if (!value || !value.toString().trim()) {
          throw new Error('Please provide details for your report');
        }
        if (value.toString().trim().length < 10) {
          throw new Error('Custom reason must be at least 10 characters');
        }
        if (value.toString().trim().length > 500) {
          throw new Error('Custom reason must not exceed 500 characters');
        }
      }
      return true;
    }),
];

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = { reportRules, validate };
