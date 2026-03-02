/**
 * Ration Shop Controller
 * CRUD operations for Fair Price Shops (ration shops).
 */
const { query } = require('../config/database');
const { success, created, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const { parsePagination } = require('../utils/helpers');
const auditService = require('../services/audit.service');

/**
 * GET /api/ration-shops
 * List shops with optional filters: taluk_id, district_id, search
 */
const getAll = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { taluk_id, district_id, search } = req.query;

        const conditions = ['rs.is_active = TRUE'];
        const params = [];
        let paramIndex = 1;

        if (taluk_id) {
            conditions.push(`rs.taluk_id = $${paramIndex++}`);
            params.push(taluk_id);
        }

        if (district_id) {
            conditions.push(`t.district_id = $${paramIndex++}`);
            params.push(district_id);
        }

        if (search) {
            conditions.push(`(rs.name ILIKE $${paramIndex} OR rs.shop_code ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Shop operator can only see their own shop
        if (req.user?.role === 'shop_operator' && req.user?.shopId) {
            conditions.push(`rs.id = $${paramIndex++}`);
            params.push(req.user.shopId);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const countResult = await query(
            `SELECT COUNT(*) FROM ration_shops rs
       LEFT JOIN taluks t ON t.id = rs.taluk_id
       ${whereClause}`,
            params
        );

        const dataResult = await query(
            `SELECT rs.*, t.name AS taluk_name, d.name AS district_name
       FROM ration_shops rs
       LEFT JOIN taluks t ON t.id = rs.taluk_id
       LEFT JOIN districts d ON d.id = t.district_id
       ${whereClause}
       ORDER BY rs.name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return paginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/ration-shops/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT rs.*, t.name AS taluk_name, d.name AS district_name, d.id AS district_id
       FROM ration_shops rs
       LEFT JOIN taluks t ON t.id = rs.taluk_id
       LEFT JOIN districts d ON d.id = t.district_id
       WHERE rs.id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Ration shop');
        }

        return success(res, result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ration-shops
 */
const create = async (req, res, next) => {
    try {
        const {
            taluk_id, shop_code, name, name_ta, address, pincode,
            latitude, longitude, ivr_phone_number, operator_name, operator_phone, operating_hours,
        } = req.body;

        const result = await query(
            `INSERT INTO ration_shops
        (taluk_id, shop_code, name, name_ta, address, pincode, latitude, longitude,
         ivr_phone_number, operator_name, operator_phone, operating_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [taluk_id, shop_code, name, name_ta, address, pincode,
                latitude, longitude, ivr_phone_number, operator_name, operator_phone, operating_hours || '09:00-17:00']
        );

        auditService.log({
            userId: req.user.id,
            action: 'shop.created',
            entityType: 'ration_shops',
            entityId: result.rows[0].id,
            newValues: result.rows[0],
            ipAddress: req.ip,
        });

        return created(res, result.rows[0], 'Ration shop created');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/ration-shops/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = req.body;

        // Get old values for audit
        const oldResult = await query(`SELECT * FROM ration_shops WHERE id = $1`, [id]);
        if (oldResult.rowCount === 0) {
            throw new NotFoundError('Ration shop');
        }

        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'name_ta', 'address', 'pincode', 'latitude', 'longitude',
            'operator_name', 'operator_phone', 'operating_hours', 'is_active',
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
            `UPDATE ration_shops SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        auditService.log({
            userId: req.user.id,
            action: 'shop.updated',
            entityType: 'ration_shops',
            entityId: id,
            oldValues: oldResult.rows[0],
            newValues: result.rows[0],
            ipAddress: req.ip,
        });

        return success(res, result.rows[0], 'Ration shop updated');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update };
