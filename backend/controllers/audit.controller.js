/**
 * Audit Controller
 * Query the immutable audit trail.
 */
const { success, paginated } = require('../utils/response');
const auditService = require('../services/audit.service');
const { parsePagination } = require('../utils/helpers');

/**
 * GET /api/audit-logs
 * Query audit logs with filters.
 */
const getLogs = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { entity_type, entity_id, user_id, action } = req.query;

        const result = await auditService.getLogs({
            entityType: entity_type,
            entityId: entity_id,
            userId: user_id,
            action,
            page,
            limit,
        });

        return paginated(res, result.logs, result.total, page, limit);
    } catch (err) {
        next(err);
    }
};

module.exports = { getLogs };
