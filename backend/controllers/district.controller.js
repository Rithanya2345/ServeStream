/**
 * District Controller
 * CRUD operations for Tamil Nadu districts.
 */
const { query } = require('../config/database');
const { success, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const { parsePagination } = require('../utils/helpers');

/**
 * GET /api/districts
 */
const getAll = async (req, res, next) => {
    try {
        const { page, limit, offset } = parsePagination(req.query);

        const countResult = await query(`SELECT COUNT(*) FROM districts WHERE is_active = TRUE`);
        const dataResult = await query(
            `SELECT * FROM districts WHERE is_active = TRUE ORDER BY name LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return paginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/districts/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await query(`SELECT * FROM districts WHERE id = $1`, [req.params.id]);

        if (result.rowCount === 0) {
            throw new NotFoundError('District');
        }

        return success(res, result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/districts/:id/taluks
 * Get all taluks under a district.
 */
const getTaluks = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT * FROM taluks WHERE district_id = $1 AND is_active = TRUE ORDER BY name`,
            [req.params.id]
        );

        return success(res, result.rows);
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, getTaluks };
