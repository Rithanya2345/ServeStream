/**
 * Audit Service
 * Direct interface for writing audit log entries from any layer.
 */
const { query } = require('../config/database');

/**
 * Insert an audit log entry.
 * @param {object} params
 */
const log = async ({
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
        console.error('[AUDIT SERVICE] Failed to write:', err.message);
    }
};

/**
 * Query audit logs with filters and pagination.
 */
const getLogs = async ({ entityType, entityId, userId, action, page = 1, limit = 20 }) => {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
    }
    if (entityId) {
        conditions.push(`entity_id = $${paramIndex++}`);
        params.push(entityId);
    }
    if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
    }
    if (action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
        `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
        params
    );

    const dataResult = await query(
        `SELECT al.*, u.full_name AS user_name, u.email AS user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return {
        logs: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
};

module.exports = { log, getLogs };
