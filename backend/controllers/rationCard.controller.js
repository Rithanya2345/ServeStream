/**
 * Ration Card Controller
 * CRUD operations for beneficiary ration cards.
 */
const { query } = require('../config/database');
const { success, created, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const { parsePagination } = require('../utils/helpers');
const auditService = require('../services/audit.service');

/**
 * GET /api/ration-cards
 * List cards with filters: shop_id, card_type, search
 */
const getAll = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { shop_id, card_type, search } = req.query;

        const conditions = ['rc.is_active = TRUE'];
        const params = [];
        let paramIndex = 1;

        // Shop operators see only their own shop's cards
        const effectiveShopId = req.user?.role === 'shop_operator' ? req.user.shopId : shop_id;

        if (effectiveShopId) {
            conditions.push(`rc.shop_id = $${paramIndex++}`);
            params.push(effectiveShopId);
        }

        if (card_type) {
            conditions.push(`rc.card_type = $${paramIndex++}`);
            params.push(card_type);
        }

        if (search) {
            conditions.push(`(rc.card_number ILIKE $${paramIndex} OR rc.head_of_family ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countResult = await query(
            `SELECT COUNT(*) FROM ration_cards rc ${whereClause}`,
            params
        );

        const dataResult = await query(
            `SELECT rc.*, rs.shop_code, rs.name AS shop_name
       FROM ration_cards rc
       JOIN ration_shops rs ON rs.id = rc.shop_id
       ${whereClause}
       ORDER BY rc.card_number
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return paginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/ration-cards/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT rc.*, rs.shop_code, rs.name AS shop_name
       FROM ration_cards rc
       JOIN ration_shops rs ON rs.id = rc.shop_id
       WHERE rc.id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Ration card');
        }

        // Also fetch family members
        const membersResult = await query(
            `SELECT * FROM family_members WHERE ration_card_id = $1 AND is_active = TRUE ORDER BY name`,
            [req.params.id]
        );

        const card = result.rows[0];
        card.family_members = membersResult.rows;

        return success(res, card);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ration-cards
 */
const create = async (req, res, next) => {
    try {
        const {
            shop_id, card_number, card_type, head_of_family,
            head_of_family_ta, mobile_number, address, total_members,
        } = req.body;

        const result = await query(
            `INSERT INTO ration_cards
        (shop_id, card_number, card_type, head_of_family, head_of_family_ta,
         mobile_number, address, total_members)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [shop_id, card_number, card_type, head_of_family,
                head_of_family_ta || null, mobile_number || null, address || null, total_members]
        );

        auditService.log({
            userId: req.user.id,
            action: 'card.created',
            entityType: 'ration_cards',
            entityId: result.rows[0].id,
            newValues: result.rows[0],
            ipAddress: req.ip,
        });

        return created(res, result.rows[0], 'Ration card created');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/ration-cards/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;

        const oldResult = await query(`SELECT * FROM ration_cards WHERE id = $1`, [id]);
        if (oldResult.rowCount === 0) {
            throw new NotFoundError('Ration card');
        }

        const fields = req.body;
        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        const allowedFields = [
            'card_type', 'head_of_family', 'head_of_family_ta',
            'mobile_number', 'address', 'total_members', 'is_active',
        ];

        for (const field of allowedFields) {
            if (fields[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex++}`);
                params.push(fields[field]);
            }
        }

        if (setClauses.length === 0) {
            return success(res, oldResult.rows[0], 'No changes made');
        }

        params.push(id);
        const result = await query(
            `UPDATE ration_cards SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        auditService.log({
            userId: req.user.id,
            action: 'card.updated',
            entityType: 'ration_cards',
            entityId: id,
            oldValues: oldResult.rows[0],
            newValues: result.rows[0],
            ipAddress: req.ip,
        });

        return success(res, result.rows[0], 'Ration card updated');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update };
