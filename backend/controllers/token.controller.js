/**
 * Token Controller
 * Token booking, listing, and status management.
 */
const { success, created, paginated } = require('../utils/response');
const tokenService = require('../services/token.service');
const { parsePagination } = require('../utils/helpers');

/**
 * POST /api/tokens/book
 * Book a new ration token.
 */
const bookToken = async (req, res, next) => {
    try {
        const { ration_card_id, shop_id, collection_date, booked_via } = req.body;

        const token = await tokenService.bookToken({
            rationCardId: ration_card_id,
            shopId: shop_id,
            collectionDate: collection_date,
            bookedVia: booked_via || 'admin',
            userId: req.user?.id,
            ipAddress: req.ip,
        });

        return created(res, token, 'Token booked successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/tokens
 * List tokens with filters: shop_id, status, booking_date
 */
const listTokens = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { shop_id, status, booking_date } = req.query;

        const effectiveShopId = req.user?.role === 'shop_operator' ? req.user.shopId : shop_id;

        const result = await tokenService.listTokens({
            shopId: effectiveShopId,
            status,
            bookingDate: booking_date,
            page,
            limit,
        });

        return paginated(res, result.tokens, result.total, page, limit);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/tokens/:id
 * Get a single token by ID.
 */
const getById = async (req, res, next) => {
    try {
        const { query: dbQuery } = require('../config/database');
        const result = await dbQuery(
            `SELECT t.*, rc.card_number, rc.head_of_family, rc.card_type,
              rs.shop_code, rs.name AS shop_name
       FROM tokens t
       JOIN ration_cards rc ON rc.id = t.ration_card_id
       JOIN ration_shops rs ON rs.id = t.shop_id
       WHERE t.id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Token not found' });
        }

        return success(res, result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/tokens/:id/status
 * Update token status (confirm, collect, cancel, expire).
 */
const updateStatus = async (req, res, next) => {
    try {
        const { status, cancel_reason } = req.body;

        const token = await tokenService.updateTokenStatus({
            tokenId: req.params.id,
            status,
            cancelReason: cancel_reason,
            userId: req.user?.id,
            ipAddress: req.ip,
        });

        return success(res, token, `Token ${status}`);
    } catch (err) {
        next(err);
    }
};

module.exports = { bookToken, listTokens, getById, updateStatus };
