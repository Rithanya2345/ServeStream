/**
 * Token Service
 * Core booking logic with transaction-safe queue number generation
 * and one-active-token enforcement.
 */
const { getClient, query } = require('../config/database');
const { BadRequestError, ConflictError, NotFoundError } = require('../utils/errors');
const { formatDate } = require('../utils/helpers');
const auditService = require('./audit.service');
const smsService = require('./sms.service');

/**
 * Book a new token.
 * Uses a DB transaction to atomically:
 *   1. Validate the ration card belongs to the shop
 *   2. Check for existing active tokens
 *   3. Generate queue number and token number
 *   4. Insert the token
 *
 * @param {object} params
 * @param {string} params.rationCardId
 * @param {string} params.shopId
 * @param {string|null} params.collectionDate
 * @param {string} params.bookedVia  'ivr' | 'admin' | 'mobile' | 'walk_in'
 * @param {string|null} params.userId  Acting user (null for IVR)
 * @param {string|null} params.ipAddress
 */
const bookToken = async ({ rationCardId, shopId, collectionDate, bookedVia = 'ivr', userId = null, ipAddress = null, shopName = null }) => {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // 1. Validate ration card exists and belongs to this shop
        const cardResult = await client.query(
            `SELECT id, card_number, shop_id, is_active FROM ration_cards WHERE id = $1`,
            [rationCardId]
        );

        if (cardResult.rowCount === 0) {
            throw new NotFoundError('Ration card');
        }

        const card = cardResult.rows[0];

        if (!card.is_active) {
            throw new BadRequestError('This ration card is inactive');
        }

        if (card.shop_id !== shopId) {
            throw new BadRequestError('This ration card is not registered at this shop');
        }

        // 2. Check for existing active token (belt-and-suspenders; DB index also enforces this)
        const activeResult = await client.query(
            `SELECT id, token_number, status FROM tokens
       WHERE ration_card_id = $1 AND status IN ('booked', 'confirmed')`,
            [rationCardId]
        );

        if (activeResult.rowCount > 0) {
            throw new ConflictError(
                `Active token already exists: ${activeResult.rows[0].token_number} (${activeResult.rows[0].status})`
            );
        }

        // 3. Generate queue number (atomic within transaction)
        const bookingDate = collectionDate || formatDate();
        const queueResult = await client.query(
            `SELECT get_next_queue_number($1, $2::date) AS queue_number`,
            [shopId, bookingDate]
        );
        const queueNumber = queueResult.rows[0].queue_number;

        // 4. Generate token number
        const tokenNumResult = await client.query(
            `SELECT generate_token_number($1, $2::date) AS token_number`,
            [shopId, bookingDate]
        );
        const tokenNumber = tokenNumResult.rows[0].token_number;

        // 5. Insert token
        const insertResult = await client.query(
            `INSERT INTO tokens (ration_card_id, shop_id, token_number, queue_number, booking_date, collection_date, booked_via)
       VALUES ($1, $2, $3, $4, $5::date, $6::date, $7)
       RETURNING *`,
            [rationCardId, shopId, tokenNumber, queueNumber, bookingDate, collectionDate || bookingDate, bookedVia]
        );

        await client.query('COMMIT');

        const token = insertResult.rows[0];

        // Calculate estimated collection time: 09:00 + (queue - 1) × 10 min
        const baseHour = 9; // Shop opens at 09:00
        const intervalMinutes = 10;
        const totalMinutes = baseHour * 60 + (queueNumber - 1) * intervalMinutes;
        const estHour = Math.floor(totalMinutes / 60);
        const estMin = totalMinutes % 60;
        const estimated_time = `${String(estHour).padStart(2, '0')}:${String(estMin).padStart(2, '0')}`;
        token.estimated_time = estimated_time;

        // Audit log (non-blocking)
        auditService.log({
            userId,
            action: 'token.booked',
            entityType: 'tokens',
            entityId: token.id,
            newValues: token,
            ipAddress,
            metadata: { bookedVia, cardNumber: card.card_number },
        });

        // SMS notification (non-blocking)
        const phoneResult = await query(
            'SELECT mobile_number, head_of_family FROM ration_cards WHERE id = $1',
            [rationCardId]
        );
        if (phoneResult.rows[0]?.mobile_number) {
            const beneficiary = phoneResult.rows[0];
            const dateStr = typeof bookingDate === 'string' ? bookingDate : new Date(bookingDate).toISOString().slice(0, 10);
            smsService.sendBookingConfirmation({
                phone: beneficiary.mobile_number,
                tokenNumber: tokenNumber,
                queueNumber: queueNumber,
                shopName: shopName || 'Your Ration Shop',
                bookingDate: dateStr,
                beneficiary: beneficiary.head_of_family,
                estimatedTime: estimated_time,
            }).catch(err => console.error('[SMS] Booking confirmation failed:', err.message));
        }

        return token;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Update token status (confirm, collect, cancel, expire).
 */
const updateTokenStatus = async ({ tokenId, status, cancelReason = null, userId = null, ipAddress = null }) => {
    // Fetch current token state for audit
    const currentResult = await query(
        `SELECT * FROM tokens WHERE id = $1`,
        [tokenId]
    );

    if (currentResult.rowCount === 0) {
        throw new NotFoundError('Token');
    }

    const oldToken = currentResult.rows[0];

    // Validate state transitions
    const validTransitions = {
        booked: ['confirmed', 'cancelled', 'expired'],
        confirmed: ['collected', 'cancelled', 'expired'],
    };

    const allowed = validTransitions[oldToken.status];
    if (!allowed || !allowed.includes(status)) {
        throw new BadRequestError(
            `Cannot transition from '${oldToken.status}' to '${status}'`
        );
    }

    // Build update
    const updates = [`status = $1`];
    const params = [status];
    let paramIndex = 2;

    if (status === 'collected') {
        updates.push(`collected_at = NOW()`);
    }

    if (status === 'cancelled') {
        updates.push(`cancelled_at = NOW()`);
        updates.push(`cancel_reason = $${paramIndex++}`);
        params.push(cancelReason);
    }

    params.push(tokenId);

    const result = await query(
        `UPDATE tokens SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
    );

    const updatedToken = result.rows[0];

    // Audit log
    auditService.log({
        userId,
        action: `token.${status}`,
        entityType: 'tokens',
        entityId: tokenId,
        oldValues: oldToken,
        newValues: updatedToken,
        ipAddress,
    });

    // SMS notification for status changes (non-blocking)
    try {
        const cardInfo = await query(
            `SELECT rc.mobile_number, rc.head_of_family, rs.name as shop_name
             FROM ration_cards rc
             JOIN ration_shops rs ON rc.shop_id = rs.id
             WHERE rc.id = $1`,
            [oldToken.ration_card_id]
        );
        const info = cardInfo.rows[0];
        if (info?.mobile_number) {
            if (status === 'cancelled') {
                smsService.sendCancellationNotice({
                    phone: info.mobile_number,
                    tokenNumber: oldToken.token_number,
                    shopName: info.shop_name,
                    beneficiary: info.head_of_family,
                });
            } else if (status === 'collected') {
                smsService.sendCollectionConfirmation({
                    phone: info.mobile_number,
                    tokenNumber: oldToken.token_number,
                    shopName: info.shop_name,
                    beneficiary: info.head_of_family,
                });
            }
        }
    } catch (smsErr) {
        console.error('[SMS] Status update notification failed:', smsErr.message);
    }

    return updatedToken;
};

/**
 * Get token status by ration card number (for IVR).
 */
const getTokenByCardNumber = async (cardNumber, shopId) => {
    const result = await query(
        `SELECT t.*, rc.card_number, rc.head_of_family
     FROM tokens t
     JOIN ration_cards rc ON rc.id = t.ration_card_id
     WHERE rc.card_number = $1 AND t.shop_id = $2
       AND t.status IN ('booked', 'confirmed')
     ORDER BY t.created_at DESC
     LIMIT 1`,
        [cardNumber, shopId]
    );

    return result.rows[0] || null;
};

/**
 * List tokens for a shop with filters.
 */
const listTokens = async ({ shopId, status, bookingDate, page = 1, limit = 20 }) => {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (shopId) {
        conditions.push(`t.shop_id = $${paramIndex++}`);
        params.push(shopId);
    }
    if (status) {
        conditions.push(`t.status = $${paramIndex++}`);
        params.push(status);
    }
    if (bookingDate) {
        conditions.push(`t.booking_date = $${paramIndex++}::date`);
        params.push(bookingDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
        `SELECT COUNT(*) FROM tokens t ${whereClause}`,
        params
    );

    const dataResult = await query(
        `SELECT t.*, rc.card_number, rc.head_of_family, rc.card_type,
            rs.shop_code, rs.name AS shop_name
     FROM tokens t
     JOIN ration_cards rc ON rc.id = t.ration_card_id
     JOIN ration_shops rs ON rs.id = t.shop_id
     ${whereClause}
     ORDER BY t.booking_date DESC, t.queue_number ASC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
    );

    return {
        tokens: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
};

module.exports = { bookToken, updateTokenStatus, getTokenByCardNumber, listTokens };
