const router = require("express").Router();
const { fdaDrugEvents, fdaDrugLabels } = require("../controllers/externalApiController");

router.get("/fda/drug-events", fdaDrugEvents);
router.get("/fda/drug-labels", fdaDrugLabels);

module.exports = router;
