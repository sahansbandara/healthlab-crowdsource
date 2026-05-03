const Experiment = require("../models/Experiment");
const mongoose = require("mongoose");

const ROLES = { ADMIN: "admin", RESEARCHER: "researcher" };

// --- Helpers ---

function normalizeEmail(str) {
  if (str == null || typeof str !== "string") return "";
  return str.trim().toLowerCase();
}

function normalizeName(str) {
  if (str == null || typeof str !== "string") return "";
  return str.trim().toLowerCase();
}

/**
 * Uniqueness key: prefer email (normalized), else "name:" + normalized name.
 * Empty key means item cannot be used for duplicate check.
 */
function getDuplicateKey(item) {
  const email = normalizeEmail(item.email);
  const name = normalizeName(item.name);
  if (email) return email;
  if (name) return `name:${name}`;
  return null;
}

function throwValidation(message) {
  const err = new Error(message);
  err.code = "VALIDATION";
  err.statusCode = 400;
  throw err;
}

function throwNotFound(message) {
  const err = new Error(message);
  err.code = "NOT_FOUND";
  err.statusCode = 404;
  throw err;
}

function throwForbidden(message) {
  const err = new Error(message);
  err.code = "FORBIDDEN";
  err.statusCode = 403;
  throw err;
}

function validateExperimentId(experimentId) {
  if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
    throwValidation("Invalid experiment id");
  }
  return new mongoose.Types.ObjectId(experimentId);
}

function validateCoResearcherId(coResearcherId) {
  if (!coResearcherId || !mongoose.Types.ObjectId.isValid(coResearcherId)) {
    throwValidation("Invalid co-researcher id");
  }
  return new mongoose.Types.ObjectId(coResearcherId);
}

/** Only experiment owner (createdBy) or admin can add/update/remove co-researchers. */
function assertCanManage(experiment, currentUser) {
  if (!currentUser || !currentUser.id) {
    throwForbidden("Authentication required");
  }
  if (currentUser.role === ROLES.ADMIN) return;
  if (experiment.createdBy && experiment.createdBy.equals(currentUser.id)) return;
  throwForbidden("Only the experiment owner or an admin can manage co-researchers");
}

/**
 * Can view list: owner, admin, or a co-researcher whose email matches one entry.
 */
function canViewCoResearchers(experiment, currentUser) {
  if (!currentUser || !currentUser.id) return false;
  if (currentUser.role === ROLES.ADMIN) return true;
  if (experiment.createdBy && experiment.createdBy.equals(currentUser.id)) return true;
  const userEmail = normalizeEmail(currentUser.email);
  if (!userEmail) return false;
  const list = experiment.coResearchers || [];
  return list.some((c) => getDuplicateKey(c) === userEmail);
}

/**
 * Check if adding/updating would create a duplicate in the array.
 * existingItems: array of { name, email?, role?, _id? }
 * newItem: { name, email?, role? } (normalized key used for duplicate check)
 * excludeId: optional ObjectId to exclude (for update: exclude current subdoc _id)
 */
function wouldBeDuplicate(existingItems, newItem, excludeId) {
  const newKey = getDuplicateKey(newItem);
  if (!newKey) return false;
  for (const existing of existingItems) {
    if (excludeId && existing._id && existing._id.equals(excludeId)) continue;
    const existingKey = getDuplicateKey(existing);
    if (existingKey && existingKey === newKey) return true;
  }
  return false;
}

/**
 * Build a co-researcher subdocument from payload (name required; email, role optional).
 * Does not set _id or addedAt; Mongoose will add them.
 */
function buildCoResearcherPayload(payload) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    throwValidation("name must be 2–80 characters");
  }
  const doc = {
    name,
    role: typeof payload.role === "string" && payload.role.trim() ? payload.role.trim() : "co-researcher",
    addedAt: new Date(),
  };
  if (payload.email != null && String(payload.email).trim() !== "") {
    const email = String(payload.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throwValidation("Invalid email format");
    }
    doc.email = email;
  }
  return doc;
}

// --- Public API ---

/**
 * Add a co-researcher to an experiment.
 * @param {string|ObjectId} experimentId
 * @param {Object} coResearcherPayload - { name (required), email?, role? }
 * @param {Object} currentUser - { id: ObjectId, role: string, email?: string }
 * @returns {Promise<Object>} updated experiment or coResearchers array (match existing list return style)
 */
async function addCoResearcher(experimentId, coResearcherPayload, currentUser) {
  const eid = validateExperimentId(experimentId);
  const experiment = await Experiment.findById(eid);
  if (!experiment) {
    throwNotFound("Experiment not found");
  }
  assertCanManage(experiment, currentUser);

  const newItem = buildCoResearcherPayload(coResearcherPayload);
  const existing = experiment.coResearchers || [];
  if (wouldBeDuplicate(existing, newItem)) {
    throwValidation("A co-researcher with this email or name already exists on this experiment");
  }

  experiment.coResearchers.push(newItem);
  await experiment.save();

  const added = experiment.coResearchers[experiment.coResearchers.length - 1];
  return added.toObject ? added.toObject() : added;
}

/**
 * List co-researchers for an experiment.
 * Allowed: experiment owner, admin, or a co-researcher whose email matches one entry.
 * @param {string|ObjectId} experimentId
 * @param {Object} currentUser - { id, role, email? }
 * @returns {Promise<Array>} list of co-researcher objects
 */
async function listCoResearchers(experimentId, currentUser) {
  const eid = validateExperimentId(experimentId);
  const experiment = await Experiment.findById(eid).select("createdBy coResearchers").lean();
  if (!experiment) {
    throwNotFound("Experiment not found");
  }
  if (!canViewCoResearchers(experiment, currentUser)) {
    throwForbidden("You do not have permission to view co-researchers for this experiment");
  }
  return experiment.coResearchers || [];
}

/**
 * Update a co-researcher by subdocument id.
 * @param {string|ObjectId} experimentId
 * @param {string|ObjectId} coResearcherId - _id of the co-researcher subdocument
 * @param {Object} updates - { name?, email?, role? } (partial)
 * @param {Object} currentUser
 * @returns {Promise<Object>} updated co-researcher object
 */
async function updateCoResearcher(experimentId, coResearcherId, updates, currentUser) {
  const eid = validateExperimentId(experimentId);
  const cid = validateCoResearcherId(coResearcherId);
  const experiment = await Experiment.findById(eid);
  if (!experiment) {
    throwNotFound("Experiment not found");
  }
  assertCanManage(experiment, currentUser);

  const coResearchers = experiment.coResearchers;
  const index = coResearchers.findIndex((c) => c._id && c._id.equals(cid));
  if (index === -1) {
    throwNotFound("Co-researcher not found");
  }

  const existingItem = coResearchers[index];
  const merged = {
    name: existingItem.name,
    email: existingItem.email,
    role: existingItem.role || "co-researcher",
  };
  if (updates.name !== undefined) {
    const name = typeof updates.name === "string" ? updates.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      throwValidation("name must be 2–80 characters");
    }
    merged.name = name;
  }
  if (updates.email !== undefined) {
    if (updates.email == null || String(updates.email).trim() === "") {
      merged.email = undefined;
    } else {
      const email = String(updates.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throwValidation("Invalid email format");
      }
      merged.email = email;
    }
  }
  if (updates.role !== undefined) {
    merged.role =
      typeof updates.role === "string" && updates.role.trim()
        ? updates.role.trim()
        : "co-researcher";
  }

  if (wouldBeDuplicate(coResearchers, merged, cid)) {
    throwValidation("Another co-researcher with this email or name already exists on this experiment");
  }

  coResearchers[index].name = merged.name;
  coResearchers[index].email = merged.email;
  coResearchers[index].role = merged.role;
  await experiment.save();

  const updated = coResearchers[index];
  return updated.toObject ? updated.toObject() : updated;
}

/**
 * Remove a co-researcher by subdocument id.
 * @param {string|ObjectId} experimentId
 * @param {string|ObjectId} coResearcherId
 * @param {Object} currentUser
 * @returns {Promise<Object>} { removed: true }
 */
async function removeCoResearcher(experimentId, coResearcherId, currentUser) {
  const eid = validateExperimentId(experimentId);
  const cid = validateCoResearcherId(coResearcherId);
  const experiment = await Experiment.findById(eid);
  if (!experiment) {
    throwNotFound("Experiment not found");
  }
  assertCanManage(experiment, currentUser);

  const coResearchers = experiment.coResearchers;
  const index = coResearchers.findIndex((c) => c._id && c._id.equals(cid));
  if (index === -1) {
    throwNotFound("Co-researcher not found");
  }

  coResearchers.splice(index, 1);
  await experiment.save();
  return { removed: true };
}

module.exports = {
  addCoResearcher,
  listCoResearchers,
  updateCoResearcher,
  removeCoResearcher,
  // helpers exposed for tests or controller validation reuse
  normalizeEmail,
  normalizeName,
  getDuplicateKey,
  buildCoResearcherPayload,
};
