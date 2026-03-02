/**
 * Audit Logger Middleware
 * Automatically logs POST/PUT/PATCH/DELETE requests to the audit_logs table.
 * This captures the action, entity, and user info without cluttering controllers.
 */
const { query } = require('../config/database');

/**
 * Creates an audit log entry.
 * Can be called directly from services or used as middleware.
 * 
 * @param {object} params
 * @param {string} params.userId      UUID of the acting user (null for IVR)
 * @param {string} params.action      e.g. 'token.booked', 'stock.updated'
 * @param {string} params.entityType  Table name, e.g. 'tokens'
 * @param {string} params.entityId    UUID of the affected row
 * @param {object} params.oldValues   Previous state (null for inserts)
 * @param {object} params.newValues   New state
 * @param {string} params.ipAddress   Requester IP
 * @param {string} params.userAgent   Browser or IVR identifier
 * @param {object} params.metadata    Extra context
 */
const createAuditLog = async ({
    userId = null,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    metadata = null,
}) => {
    try {
        await query(
            `INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                action,
                entityType,
                entityId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress,
                userAgent,
                metadata ? JSON.stringify(metadata) : null,
            ]
        );
    } catch (err) {
        // Audit logging should never break the request — log and continue
        console.error('[AUDIT] Failed to write audit log:', err.message);
    }
};

/**
 * Express middleware that auto-logs mutation requests.
 * Attach after the route handler has set res.locals.auditData.
 */
const auditMiddleware = (action, entityType) => {
    return (req, res, next) => {
        // Store audit context so the controller can populate entity details
        req.auditContext = { action, entityType };

        // Override res.json to intercept the response and log
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only audit successful mutations
            if (res.statusCode >= 200 && res.statusCode < 300 && body?.data?.id) {
                createAuditLog({
                    userId: req.user?.id || null,
                    action,
                    entityType,
                    entityId: body.data.id,
                    oldValues: res.locals?.auditOldValues || null,
                    newValues: body.data,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    metadata: res.locals?.auditMetadata || null,
                });
            }
            return originalJson(body);
        };

        next();
    };
};

module.exports = { createAuditLog, auditMiddleware };
