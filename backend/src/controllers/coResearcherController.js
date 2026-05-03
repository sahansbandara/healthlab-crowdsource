const coResearcherService = require("../services/coResearcherService");

/**
 * Build currentUser from req (set by auth middleware or placeholder headers).
 * Same shape expected by coResearcherService: { id, role, email? }
 */
function getCurrentUser(req) {
  if (!req.user) return null;
  const email =
    req.user.email != null
      ? req.user.email
      : (req.headers["x-user-email"] != null ? req.headers["x-user-email"] : undefined);
  return {
    id: req.user.id,
    role: req.user.role,
    ...(email !== undefined && email !== "" && { email: String(email).trim() }),
  };
}

function sendError(res, err) {
  const status = err.statusCode || 500;
  const payload = { success: false, message: err.message || "Internal server error" };
  if (err.errors) payload.errors = err.errors;
  res.status(status).json(payload);
}

// --- Handlers ---

async function addCoResearcher(req, res, next) {
  try {
    const experimentId = req.params.experimentId;
    const body = req.body || {};
    const currentUser = getCurrentUser(req);
    const coResearcherPayload = {
      name: body.name,
      email: body.email,
      role: body.role,
    };
    const data = await coResearcherService.addCoResearcher(
      experimentId,
      coResearcherPayload,
      currentUser
    );
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function listCoResearchers(req, res, next) {
  try {
    const experimentId = req.params.experimentId;
    const currentUser = getCurrentUser(req);
    const data = await coResearcherService.listCoResearchers(experimentId, currentUser);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function updateCoResearcher(req, res, next) {
  try {
    const experimentId = req.params.experimentId;
    const coResearcherId = req.params.coResearcherId;
    const updates = {};
    const body = req.body || {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email;
    if (body.role !== undefined) updates.role = body.role;
    const currentUser = getCurrentUser(req);
    const data = await coResearcherService.updateCoResearcher(
      experimentId,
      coResearcherId,
      updates,
      currentUser
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function removeCoResearcher(req, res, next) {
  try {
    const experimentId = req.params.experimentId;
    const coResearcherId = req.params.coResearcherId;
    const currentUser = getCurrentUser(req);
    const data = await coResearcherService.removeCoResearcher(
      experimentId,
      coResearcherId,
      currentUser
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode) return sendError(res, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

module.exports = {
  addCoResearcher,
  listCoResearchers,
  updateCoResearcher,
  removeCoResearcher,
};
