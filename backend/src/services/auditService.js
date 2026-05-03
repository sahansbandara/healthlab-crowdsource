const FundAuditLog = require('../models/FundAuditLog');
const logger = require('../utils/logger');

const logAction = async ({
    actorId,
    actorRole,
    action,
    fundRequestId = null,
    experimentId = null,
    fromStatus = null,
    toStatus = null,
    metadata = {}
}) => {
    try {
        await FundAuditLog.create({
            actorId,
            actorRole,
            action,
            fundRequestId,
            experimentId,
            fromStatus,
            toStatus,
            metadata
        });
        logger.info(`Audit: ${action} by ${actorRole} (${actorId})`, { metadata });
    } catch (error) {
        logger.error(`Failed to create audit log for ${action}`, error);
        // We don't throw here to avoid failing the main transaction if audit logging fails (depending on strictness)
        // In strict financial systems, we might want to throw. Here we log error.
    }
};

module.exports = { logAction };
