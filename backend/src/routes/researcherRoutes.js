const router = require("express").Router();
const {
  registerResearcher,
  getResearchers,
  getResearcherById,
  reviewResearcher,
} = require("../controllers/researcherController");

router.post("/register", registerResearcher);
router.get("/", getResearchers);
router.get("/:id", getResearcherById);
router.put("/:id/review", reviewResearcher);

module.exports = router;
