/**
 * Stock Service
 * Business logic for shop stock queries and updates.
 */
const { query } = require('../config/database');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { getCurrentPeriod } = require('../utils/helpers');

/**
 * Get stock for a specific shop for the current month (or a specified period).
 */
const getShopStock = async (shopId, month, year) => {
    const period = month && year ? { month, year } : getCurrentPeriod();

    const result = await query(
        `SELECT ss.*, c.name AS commodity_name, c.name_ta AS commodity_name_ta, c.unit
     FROM shop_stock ss
     JOIN commodities c ON c.id = ss.commodity_id
     WHERE ss.shop_id = $1 AND ss.month = $2 AND ss.year = $3
     ORDER BY c.name`,
        [shopId, period.month, period.year]
    );

    return result.rows;
};

/**
 * Upsert stock for a shop/commodity/period.
 * If the record exists, it updates; otherwise, it inserts.
 */
const upsertStock = async ({ shopId, commodityId, month, year, allocatedQty, distributedQty = 0, userId }) => {
    if (distributedQty > allocatedQty) {
        throw new BadRequestError('Distributed quantity cannot exceed allocated quantity');
    }

    const result = await query(
        `INSERT INTO shop_stock (shop_id, commodity_id, month, year, allocated_qty, distributed_qty, last_updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (shop_id, commodity_id, month, year)
     DO UPDATE SET
       allocated_qty = EXCLUDED.allocated_qty,
       distributed_qty = EXCLUDED.distributed_qty,
       last_updated_by = EXCLUDED.last_updated_by
     RETURNING *`,
        [shopId, commodityId, month, year, allocatedQty, distributedQty, userId]
    );

    return result.rows[0];
};

/**
 * Get aggregated stock summary for IVR voice prompt.
 * Returns commodity names and remaining quantities for the current month.
 */
const getStockForIVR = async (shopId) => {
    const { month, year } = getCurrentPeriod();

    const result = await query(
        `SELECT c.name, c.name_ta, c.unit, ss.remaining_qty
     FROM shop_stock ss
     JOIN commodities c ON c.id = ss.commodity_id
     WHERE ss.shop_id = $1 AND ss.month = $2 AND ss.year = $3
       AND ss.remaining_qty > 0
     ORDER BY c.name`,
        [shopId, month, year]
    );

    return result.rows;
};

/**
 * Update distributed quantity after ration collection.
 * Called when a token status changes to 'collected'.
 */
const recordDistribution = async (shopId, commodityId, quantity, month, year) => {
    const result = await query(
        `UPDATE shop_stock
     SET distributed_qty = distributed_qty + $1
     WHERE shop_id = $2 AND commodity_id = $3 AND month = $4 AND year = $5
       AND (distributed_qty + $1) <= allocated_qty
     RETURNING *`,
        [quantity, shopId, commodityId, month, year]
    );

    if (result.rowCount === 0) {
        throw new BadRequestError('Insufficient stock or stock record not found');
    }

    return result.rows[0];
};

module.exports = { getShopStock, upsertStock, getStockForIVR, recordDistribution };
