/**
 * Commodity Controller
 * List and manage the master commodity catalog.
 */
const { query } = require('../config/database');
const { success, created } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');

/**
 * GET /api/commodities
 */
const getAll = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT * FROM commodities WHERE is_active = TRUE ORDER BY name`
        );
        return success(res, result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/commodities/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await query(`SELECT * FROM commodities WHERE id = $1`, [req.params.id]);
        if (result.rowCount === 0) {
            throw new NotFoundError('Commodity');
        }
        return success(res, result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/commodities
 */
const create = async (req, res, next) => {
    try {
        const { name, name_ta, unit, description } = req.body;
        const result = await query(
            `INSERT INTO commodities (name, name_ta, unit, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, name_ta || null, unit || 'kg', description || null]
        );
        return created(res, result.rows[0], 'Commodity created');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create };
