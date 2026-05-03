const Researcher = require("../models/Researcher");
const { HTTP_STATUS } = require("../config/constants");

/**
 * Use after protect + authorize('researcher'). Ensures researcher has status "approved"
 * for create (POST), update (PUT), and delete (DELETE) of experiments.
 */
const researcherApprovedForPublish = async (req, res, next) => {
  const writeMethods = ["POST", "PUT", "DELETE"];
  if (!writeMethods.includes(req.method)) return next();
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Authentication required" });
  }
  if (req.user.role !== "researcher") return next();
  const researcher = await Researcher.findOne({ user: req.user._id });
  if (!researcher) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "Researcher profile not found",
    });
  }
  if (researcher.status !== "approved") {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "Admin approval required. You cannot create experiments until an admin has approved your researcher account.",
    });
  }
  next();
};

module.exports = researcherApprovedForPublish;
