const { query } = require('../config/database');
const tokenService = require('../services/token.service');
const smsService = require('../services/sms.service');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Get Ration Card Details (Public/Chatbot)
 * Returns Card Info + Shop Info + District/Taluk + Family + Entitlements (TNEPDS-style)
 */
const getCardDetails = async (req, res, next) => {
    try {
        const { card_number } = req.body;

        if (!card_number) {
            throw new BadRequestError('Card number is required');
        }

        const result = await query(
            `SELECT 
                rc.id, rc.card_number, rc.head_of_family, rc.head_of_family_ta, rc.card_type, 
                rc.is_active, rc.mobile_number, rc.address, rc.total_members,
                rs.id as shop_id, rs.name as shop_name, rs.name_ta as shop_name_ta, rs.shop_code,
                rs.address as shop_address, rs.pincode as shop_pincode, 
                rs.operating_hours, rs.operator_name, rs.operator_phone,
                rs.latitude as shop_lat, rs.longitude as shop_lng,
                d.name as district_name, d.name_ta as district_name_ta,
                t.name as taluk_name, t.name_ta as taluk_name_ta
             FROM ration_cards rc
             JOIN ration_shops rs ON rc.shop_id = rs.id
             JOIN taluks t ON rs.taluk_id = t.id
             JOIN districts d ON t.district_id = d.id
             WHERE rc.card_number = $1`,
            [card_number]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Ration card not found');
        }

        const cardData = result.rows[0];

        // Fetch family members (with Aadhaar status)
        const membersResult = await query(
            'SELECT name, name_ta, age, gender, relationship, aadhaar_last4, is_active FROM family_members WHERE ration_card_id = $1 ORDER BY relationship',
            [cardData.id]
        );

        // Fetch monthly entitlements (current month stock allocation for this shop)
        const now = new Date();
        const entitlementsResult = await query(
            `SELECT c.name, c.name_ta, c.unit, ss.allocated_qty, ss.distributed_qty, ss.remaining_qty
             FROM shop_stock ss
             JOIN commodities c ON ss.commodity_id = c.id
             WHERE ss.shop_id = $1 AND ss.month = $2 AND ss.year = $3
             ORDER BY c.name`,
            [cardData.shop_id, now.getMonth() + 1, now.getFullYear()]
        );

        // Card type entitlement descriptions
        const cardTypeInfo = {
            'PHH': { label: 'Priority Household', label_ta: 'முன்னுரிமை குடும்பம்', color: 'rose' },
            'AAY': { label: 'Antyodaya Anna Yojana', label_ta: 'அந்தியோதய அன்ன யோஜனா', color: 'orange' },
            'NPHH': { label: 'Non-Priority Household', label_ta: 'முன்னுரிமை அல்லாத குடும்பம்', color: 'blue' },
            'NPS': { label: 'No Purchase Sugar', label_ta: 'சர்க்கரை வாங்காத அட்டை', color: 'gray' }
        };

        res.json({
            success: true,
            data: {
                ...cardData,
                card_type_info: cardTypeInfo[cardData.card_type] || { label: cardData.card_type, label_ta: '', color: 'gray' },
                members: membersResult.rows,
                entitlements: entitlementsResult.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Book Token (Public/Chatbot)
 */
const bookToken = async (req, res, next) => {
    try {
        const { card_number, shop_id } = req.body;

        if (!card_number || !shop_id) {
            throw new BadRequestError('Card number and Shop ID are required');
        }

        // 1. Verify Card exists and belongs to shop (Security check)
        const cardResult = await query(
            'SELECT rc.id, rc.is_active, rs.name as shop_name FROM ration_cards rc JOIN ration_shops rs ON rc.shop_id = rs.id WHERE rc.card_number = $1 AND rc.shop_id = $2',
            [card_number, shop_id]
        );

        if (cardResult.rowCount === 0) {
            throw new NotFoundError('Invalid card or shop mismatch');
        }

        const card = cardResult.rows[0];

        if (!card.is_active) {
            throw new BadRequestError('Ration card is inactive');
        }

        // 2. Book Token
        const token = await tokenService.bookToken({
            rationCardId: card.id,
            shopId: shop_id,
            bookedVia: 'chatbot',
            shopName: card.shop_name
        });


        res.json({
            success: true,
            data: token,
            message: 'Token booked successfully'
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Check Token Status (Public/Chatbot)
 */
const checkStatus = async (req, res, next) => {
    try {
        const { card_number } = req.body;

        if (!card_number) {
            throw new BadRequestError('Card number is required');
        }

        // Get Card ID first
        const cardResult = await query(
            'SELECT id, shop_id FROM ration_cards WHERE card_number = $1',
            [card_number]
        );

        if (cardResult.rowCount === 0) {
            throw new NotFoundError('Ration card not found');
        }

        const card = cardResult.rows[0];

        const token = await tokenService.getTokenByCardNumber(card_number, card.shop_id);

        if (!token) {
            return res.json({
                success: true,
                data: null,
                message: 'No active token found'
            });
        }

        res.json({
            success: true,
            data: token
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get Booking History (Public/Chatbot)
 */
const getBookingHistory = async (req, res, next) => {
    try {
        const { card_number } = req.body;

        if (!card_number) {
            throw new BadRequestError('Card number is required');
        }

        const result = await query(
            `SELECT 
                t.id, t.token_number, t.queue_number, t.booking_date, t.collection_date, t.status,
                s.name as shop_name, s.name_ta as shop_name_ta
             FROM tokens t
             JOIN ration_cards rc ON t.ration_card_id = rc.id
             JOIN ration_shops s ON t.shop_id = s.id
             WHERE rc.card_number = $1
             ORDER BY t.booking_date DESC
             LIMIT 10`,
            [card_number]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCardDetails,
    bookToken,
    checkStatus,
    getBookingHistory
};
