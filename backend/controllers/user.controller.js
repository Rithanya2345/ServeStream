/**
 * User Controller
 * Manage system users (list, update, deactivate).
 */
const { query } = require('../config/database');
const { success, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const { parsePagination } = require('../utils/helpers');

/**
 * GET /api/users
 */
const getAll = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);
        const { role, shop_id } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (role) {
            conditions.push(`u.role = $${paramIndex++}`);
            params.push(role);
        }
        if (shop_id) {
            conditions.push(`u.shop_id = $${paramIndex++}`);
            params.push(shop_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
        const dataResult = await query(
            `SELECT u.id, u.email, u.full_name, u.full_name_ta, u.phone, u.role,
              u.shop_id, u.district_id, u.is_active, u.last_login_at, u.created_at,
              rs.shop_code, rs.name AS shop_name,
              d.name AS district_name
       FROM users u
       LEFT JOIN ration_shops rs ON rs.id = u.shop_id
       LEFT JOIN districts d ON d.id = u.district_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return paginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/users/:id
 * Update a user (role, active status, shop assignment).
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role, shop_id, district_id, is_active, full_name, phone } = req.body;

        const oldResult = await query(`SELECT * FROM users WHERE id = $1`, [id]);
        if (oldResult.rowCount === 0) {
            throw new NotFoundError('User');
        }

        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        if (role !== undefined) { setClauses.push(`role = $${paramIndex++}`); params.push(role); }
        if (shop_id !== undefined) { setClauses.push(`shop_id = $${paramIndex++}`); params.push(shop_id); }
        if (district_id !== undefined) { setClauses.push(`district_id = $${paramIndex++}`); params.push(district_id); }
        if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); params.push(is_active); }
        if (full_name !== undefined) { setClauses.push(`full_name = $${paramIndex++}`); params.push(full_name); }
        if (phone !== undefined) { setClauses.push(`phone = $${paramIndex++}`); params.push(phone); }

        if (setClauses.length === 0) {
            return success(res, oldResult.rows[0], 'No changes made');
        }

        params.push(id);
        const result = await query(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, full_name, role, shop_id, district_id, is_active`,
            params
        );

        return success(res, result.rows[0], 'User updated');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, update };
