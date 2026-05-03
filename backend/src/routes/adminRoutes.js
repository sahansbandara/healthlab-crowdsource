// Admin routes: dashboard, users, researchers, experiments, fund requests. All require admin role.
const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  reviewResearcherRules,
  deleteExperimentRules,
  userActionRules,
  researcherIdRules,
  validate,
} = require("../validators/adminValidators");
const {
  getPendingResearchers,
  getResearchers,
  getResearcherById,
  approveResearcher,
  rejectResearcher,
  deleteResearcher,
  getUsers,
  getUnapprovedResearchers,
  approveUser,
  rejectUser,
  deleteUser,
  deleteExperiment,
  exportResearchersPdf,
  exportOverviewPdf,
  getAnalytics,
  getAllRequests,
  updateStatus,
  getReports,
  disburseRequest,
} = require("../controllers/adminController");
const { getWallet } = require("../controllers/walletController");
const {
  getAllReports,
  getPostReportDetails,
  banUserForReport,
  deleteReportedPost,
} = require("../modules/community/controllers/reportController");

const adminGuard = [protect, authorize("admin")];

// Analytics and reports
router.get("/analytics", adminGuard, getAnalytics);
router.get("/analytics/export/pdf", adminGuard, exportOverviewPdf);
router.get("/fund-analytics", adminGuard, getAnalytics);
router.get("/fund-reports", adminGuard, getReports);

// Users: list all, list unapproved, approve or reject by id
router.get("/users", adminGuard, getUsers);
router.get("/users/unapproved", adminGuard, getUnapprovedResearchers);
router.patch("/users/approve/:id", adminGuard, userActionRules(), validate, approveUser);
router.patch("/users/reject/:id", adminGuard, userActionRules(), validate, rejectUser);
router.delete("/users/:id", adminGuard, userActionRules(), validate, deleteUser);

// Researchers: list pending, list (optional status filter), get one, approve/reject, delete, export PDF
router.get("/researchers/pending", adminGuard, getPendingResearchers);
router.get("/researchers", adminGuard, getResearchers);
router.get("/researchers/export/pdf", adminGuard, exportResearchersPdf);
router.get("/researchers/:id", adminGuard, researcherIdRules(), validate, getResearcherById);
router.put("/researchers/:id/approve", adminGuard, reviewResearcherRules(), validate, approveResearcher);
router.put("/researchers/:id/reject", adminGuard, reviewResearcherRules(), validate, rejectResearcher);
router.delete("/researchers/:id", adminGuard, researcherIdRules(), validate, deleteResearcher);

// Experiments: admin can delete (optional reject researcher / reassign to participant)
router.delete("/experiments/:id", adminGuard, deleteExperimentRules(), validate, deleteExperiment);

// Fund requests: list all, update status; get experiment wallet
router.get("/fund-requests", adminGuard, getAllRequests);
router.patch("/fund-requests/:id/status", adminGuard, updateStatus);
router.get("/experiments/:experimentId/wallet", adminGuard, getWallet);

// Post reports: list all, get details, ban user, delete post
router.get("/reports", adminGuard, getAllReports);
router.get("/reports/:postId", adminGuard, getPostReportDetails);
router.post("/reports/:postId/ban-user", adminGuard, banUserForReport);
router.delete("/reports/:postId", adminGuard, deleteReportedPost);

module.exports = router;
