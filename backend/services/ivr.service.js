/**
 * IVR Service
 * Handles the IVR call flow: shop lookup, menu actions, and call logging.
 * This is the brain of the IVR system — all telephony-facing logic lives here.
 */
const { query } = require('../config/database');
const tokenService = require('./token.service');
const stockService = require('./stock.service');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Look up a ration shop by its IVR phone number.
 * This is the first step when an incoming call arrives.
 */
const getShopByIVRPhone = async (ivrPhone) => {
    const result = await query(
        `SELECT id, shop_code, name, name_ta, ivr_phone_number, operating_hours, is_active
     FROM ration_shops WHERE ivr_phone_number = $1`,
        [ivrPhone]
    );

    if (result.rowCount === 0) {
        return null;
    }

    return result.rows[0];
};

/**
 * Validate a ration card number within a specific shop.
 * Returns the card if valid, null if not found or not linked to shop.
 */
const validateCard = async (cardNumber, shopId) => {
    const result = await query(
        `SELECT id, card_number, card_type, head_of_family, head_of_family_ta,
            mobile_number, total_members, is_active, shop_id
     FROM ration_cards
     WHERE card_number = $1 AND shop_id = $2`,
        [cardNumber, shopId]
    );

    if (result.rowCount === 0) {
        return null;
    }

    return result.rows[0];
};

/**
 * Process IVR action: Book Token (DTMF 1)
 */
const handleBookToken = async (shopId, cardNumber, callerNumber, callSid) => {
    // Validate card
    const card = await validateCard(cardNumber, shopId);

    if (!card) {
        await logCall({
            shopId,
            rationCardId: null,
            callerNumber,
            ivrPhone: null, // Will be set by caller
            action: 'invalid_card',
            dtmfInput: cardNumber,
            callSid,
            isSuccessful: false,
            responseText: 'Invalid ration card number or card not registered at this shop.',
        });

        return {
            success: false,
            action: 'invalid_card',
            message: 'தவறான ரேஷன் அட்டை எண் அல்லது இந்த கடையில் பதிவு செய்யப்படவில்லை.',
            messageEn: 'Invalid ration card number or not registered at this shop.',
        };
    }

    if (!card.is_active) {
        return {
            success: false,
            action: 'invalid_card',
            message: 'உங்கள் ரேஷன் அட்டை செயலில் இல்லை.',
            messageEn: 'Your ration card is not active.',
        };
    }

    // Attempt booking
    try {
        const token = await tokenService.bookToken({
            rationCardId: card.id,
            shopId,
            bookedVia: 'ivr',
        });

        await logCall({
            shopId,
            rationCardId: card.id,
            callerNumber,
            action: 'book_token',
            dtmfInput: cardNumber,
            tokenId: token.id,
            callSid,
            isSuccessful: true,
            responseText: `Token booked: ${token.token_number}, Queue: ${token.queue_number}`,
        });

        return {
            success: true,
            action: 'book_token',
            token_number: token.token_number,
            queue_number: token.queue_number,
            collection_date: token.collection_date,
            message: `உங்கள் டோக்கன் பதிவு செய்யப்பட்டது. டோக்கன் எண்: ${token.token_number}. வரிசை எண்: ${token.queue_number}.`,
            messageEn: `Token booked. Token number: ${token.token_number}. Queue number: ${token.queue_number}.`,
        };
    } catch (err) {
        if (err.statusCode === 409) {
            await logCall({
                shopId,
                rationCardId: card.id,
                callerNumber,
                action: 'duplicate_booking',
                dtmfInput: cardNumber,
                callSid,
                isSuccessful: false,
                responseText: err.message,
            });

            return {
                success: false,
                action: 'duplicate_booking',
                message: 'உங்களுக்கு ஏற்கனவே ஒரு செயலில் உள்ள டோக்கன் உள்ளது.',
                messageEn: 'You already have an active token.',
            };
        }
        throw err;
    }
};

/**
 * Process IVR action: Check Token Status (DTMF 2)
 */
const handleCheckStatus = async (shopId, cardNumber, callerNumber, callSid) => {
    const card = await validateCard(cardNumber, shopId);

    if (!card) {
        return {
            success: false,
            action: 'invalid_card',
            message: 'தவறான ரேஷன் அட்டை எண்.',
            messageEn: 'Invalid ration card number.',
        };
    }

    const token = await tokenService.getTokenByCardNumber(cardNumber, shopId);

    await logCall({
        shopId,
        rationCardId: card.id,
        callerNumber,
        action: 'check_status',
        dtmfInput: cardNumber,
        tokenId: token?.id,
        callSid,
        isSuccessful: true,
        responseText: token
            ? `Token: ${token.token_number}, Status: ${token.status}, Queue: ${token.queue_number}`
            : 'No active token found',
    });

    if (!token) {
        return {
            success: true,
            action: 'check_status',
            has_token: false,
            message: 'இந்த அட்டைக்கு செயலில் உள்ள டோக்கன் எதுவும் இல்லை.',
            messageEn: 'No active token found for this card.',
        };
    }

    return {
        success: true,
        action: 'check_status',
        has_token: true,
        token_number: token.token_number,
        queue_number: token.queue_number,
        status: token.status,
        collection_date: token.collection_date,
        message: `உங்கள் டோக்கன் எண்: ${token.token_number}. வரிசை எண்: ${token.queue_number}. நிலை: ${token.status}.`,
        messageEn: `Token: ${token.token_number}. Queue: ${token.queue_number}. Status: ${token.status}.`,
    };
};

/**
 * Process IVR action: Check Stock Availability (DTMF 3)
 */
const handleCheckStock = async (shopId, callerNumber, callSid) => {
    const stock = await stockService.getStockForIVR(shopId);

    const stockLines = stock.map(
        (s) => `${s.name_ta || s.name}: ${s.remaining_qty} ${s.unit}`
    );

    const messageTa = stock.length > 0
        ? `கிடைக்கும் பொருட்கள்: ${stockLines.join('. ')}.`
        : 'தற்போது இருப்பு தகவல் இல்லை.';

    const messageEn = stock.length > 0
        ? `Available items: ${stock.map((s) => `${s.name}: ${s.remaining_qty} ${s.unit}`).join(', ')}.`
        : 'No stock information available currently.';

    await logCall({
        shopId,
        callerNumber,
        action: 'check_stock',
        callSid,
        isSuccessful: true,
        responseText: messageEn,
    });

    return {
        success: true,
        action: 'check_stock',
        stock,
        message: messageTa,
        messageEn,
    };
};

/**
 * Log an IVR call interaction.
 */
const logCall = async ({
    shopId,
    rationCardId = null,
    callerNumber = null,
    ivrPhone = null,
    action,
    dtmfInput = null,
    tokenId = null,
    callSid = null,
    isSuccessful = false,
    responseText = null,
    callDuration = 0,
    errorMessage = null,
}) => {
    try {
        // If ivrPhone not provided, look it up from the shop
        if (!ivrPhone && shopId) {
            const shopResult = await query(
                `SELECT ivr_phone_number FROM ration_shops WHERE id = $1`,
                [shopId]
            );
            ivrPhone = shopResult.rows[0]?.ivr_phone_number || '';
        }

        await query(
            `INSERT INTO ivr_call_logs
        (shop_id, ration_card_id, caller_number, ivr_phone, action, dtmf_input,
         token_id, response_text, call_duration, call_sid, is_successful, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                shopId, rationCardId, callerNumber, ivrPhone, action, dtmfInput,
                tokenId, responseText, callDuration, callSid, isSuccessful, errorMessage,
            ]
        );
    } catch (err) {
        console.error('[IVR SERVICE] Failed to log call:', err.message);
    }
};

module.exports = {
    getShopByIVRPhone,
    validateCard,
    handleBookToken,
    handleCheckStatus,
    handleCheckStock,
    logCall,
};
