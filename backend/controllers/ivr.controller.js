/**
 * IVR Controller
 * Handles incoming IVR calls from the telephony provider / simulator.
 * This is the HTTP interface that the IVR system calls.
 */
const ivrService = require('../services/ivr.service');
const { success } = require('../utils/response');
const { BadRequestError } = require('../utils/errors');

/**
 * POST /api/ivr/incoming
 * Main IVR endpoint — processes an incoming call/action.
 *
 * Expected body:
 *   {
 *     ivr_phone: "044-1234567",          // Which IVR number was called
 *     caller_number: "9876543210",        // Caller's phone (CLI)
 *     action: "menu"|"book_token"|"check_status"|"check_stock"|"cancel_token",
 *     card_number: "TN-CHN-000001",       // Required for token/status actions
 *     dtmf_input: "1",                    // Raw DTMF key
 *     call_sid: "CALL-xxxx"               // Telephony call ID
 *   }
 */
const handleIncoming = async (req, res, next) => {
    try {
        // Support both JSON (simulator/debug) and standard form-urlencoded (Twilio)
        const body = req.body || {};
        console.log('[IVR Debug] Body:', JSON.stringify(body));
        const { CallSid, From, To, Digits } = body;

        // Normalize inputs
        // Twilio sends 'From' and 'To' (e.g. +91...)
        // Our Service expects 'caller_number' and 'ivr_phone'
        const caller_number = From || body.caller_number;
        const ivr_phone = To || body.ivr_phone;
        const inputDigits = Digits || body.dtmf_input; // 'Digits' from Twilio, 'dtmf_input' from JSON

        // Step 1: Identify Shop
        const shop = await ivrService.getShopByIVRPhone(ivr_phone);

        // Helper to send TwiML response
        const sendTwiML = (text, gather = false) => {
            res.type('text/xml');
            let response = '<?xml version="1.0" encoding="UTF-8"?><Response>';
            if (gather) {
                response += `<Gather numDigits="12" timeout="10" action="/api/ivr/incoming" method="POST"><Say language="ta-IN">${text}</Say></Gather>`;
                response += `<Say language="ta-IN">Time out. Please call again.</Say>`;
            } else {
                response += `<Say language="ta-IN">${text}</Say>`;
            }
            response += '</Response>';
            res.send(response);
        };

        if (!shop || !shop.is_active) {
            return sendTwiML('This ration shop number is invalid or inactive. Please check the number and try again.');
        }

        // Step 2: Determine Action based on Input (State Machine)
        // If no digits, play Main Menu
        if (!inputDigits) {
            const welcomeMsg = `Welcome to ${shop.name}. 
             For Token Booking, press 1. 
             To Check Status, press 2. 
             To Check Stock, press 3.`;
            return sendTwiML(welcomeMsg, true);
        }

        // Logic for handling digits
        // Simple 1-level menu for now. 
        // For '1' (Book) and '2' (Status), we need the Ration Card Number.
        // If the user entered just '1' or '2', we need to ASK for the card number.
        // But since this is a stateless webhook, we need to know "what was the previous state?".
        // For simplicity: We will assume:
        // - Single digit (1,2,3) = Menu Selection
        // - 10-12 digits = Ration Card Number (context required)

        // Wait! Stateless HTTP makes "context" hard without cookies or query params.
        // Twilio maintains session? No, we have to use cookies or encoded URL params in 'action'.
        // BUT, for this MVP, let's use a trick:
        // - Menu: 1, 2, 3
        // - Book Flow: User presses 1 -> System says "Enter card number" -> <Gather>
        // - But the NEXT request will just have Digits="33000...". 
        // - How do we know it's for Booking?

        // Solution: We'll interpret length.
        // 1 digit = Menu
        // >4 digits = Ration Card Number
        // But what if they want to check status (2) -> Enter Card?
        // We can't distinguish "Card for Booking" vs "Card for Status" just by length.

        // Refined approach for MVP:
        // Use the digits length to enable 'Direct Dial' style or just support "1 + CardNumber" ? No that's hard.

        // Let's implement the 'Flow' using a crude session via CallSid if needed, OR just support specific prefixes?
        // OR: Just ask for the card number upfront for everything?
        // "Welcome. Please enter your Ration Card Number followed by hash."

        // Let's try the "Enter Card First" approach as it's stateless and robust.
        // Flow:
        // 1. No Digits -> "Welcome. Enter Ration Card Number."
        // 2. 12 Digits -> "Press 1 to Book, 2 for Status."
        // 3. 12 Digits + 1 -> Handle Book.

        // Better: Use `action` URL param in TwiML to encode state!
        // <Gather action="/api/ivr/incoming?state=menu_selected">

        const state = req.query.state || 'initial';

        if (state === 'initial') {
            // Main Menu
            if (!inputDigits) {
                return sendTwiML(`Welcome to ${shop.name}. Press 1 to Book Token. Press 2 to Check Status. Press 3 to Check Stock.`, true);
            }

            // Handle Menu Selection
            if (inputDigits === '1') {
                // Play "Enter Card" and gather with state=booking
                res.type('text/xml');
                return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response>
                    <Gather numDigits="12" timeout="10" action="/api/ivr/incoming?state=booking_card" method="POST">
                        <Say>Please enter your 12 digit ration card number.</Say>
                    </Gather>
                 </Response>`);
            }
            else if (inputDigits === '2') {
                res.type('text/xml');
                return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response>
                    <Gather numDigits="12" timeout="10" action="/api/ivr/incoming?state=status_card" method="POST">
                        <Say>Please enter your 12 digit ration card number.</Say>
                    </Gather>
                 </Response>`);
            }
            else if (inputDigits === '3') {
                // Check Stock (No card needed)
                const result = await ivrService.handleCheckStock(shop.id, caller_number, CallSid);
                return sendTwiML(result.message + " Thank you.");
            }
            else {
                return sendTwiML("Invalid option. Press 1, 2, or 3.", true);
            }
        }

        if (state === 'booking_card') {
            const card_number = inputDigits;
            const result = await ivrService.handleBookToken(shop.id, card_number, caller_number, CallSid);
            return sendTwiML(result.message);
        }

        if (state === 'status_card') {
            const card_number = inputDigits;
            const result = await ivrService.handleCheckStatus(shop.id, card_number, caller_number, CallSid);
            return sendTwiML(result.message);
        }

        return sendTwiML("System Error. Goodbye.");

    } catch (err) {
        console.error(err);
        res.type('text/xml');
        res.send('<Response><Say>An error occurred. Please try again later.</Say></Response>');
    }
};

/**
 * GET /api/ivr/call-logs
 * Query call logs (for admin dashboard).
 */
const getCallLogs = async (req, res, next) => {
    try {
        const { query: dbQuery } = require('../config/database');
        const { parsePagination } = require('../utils/helpers');
        const { paginated } = require('../utils/response');

        const { page, limit, offset } = parsePagination(req.query);
        const { shop_id, action: actionFilter, date } = req.query;

        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (shop_id) {
            conditions.push(`icl.shop_id = $${paramIndex++}`);
            params.push(shop_id);
        }
        if (actionFilter) {
            conditions.push(`icl.action = $${paramIndex++}`);
            params.push(actionFilter);
        }
        if (date) {
            conditions.push(`DATE(icl.created_at) = $${paramIndex++}::date`);
            params.push(date);
        }

        // Shop operators see only their own shop
        if (req.user?.role === 'shop_operator' && req.user?.shopId) {
            conditions.push(`icl.shop_id = $${paramIndex++}`);
            params.push(req.user.shopId);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await dbQuery(
            `SELECT COUNT(*) FROM ivr_call_logs icl ${whereClause}`,
            params
        );

        const dataResult = await dbQuery(
            `SELECT icl.*, rs.shop_code, rs.name AS shop_name,
              rc.card_number, rc.head_of_family
       FROM ivr_call_logs icl
       LEFT JOIN ration_shops rs ON rs.id = icl.shop_id
       LEFT JOIN ration_cards rc ON rc.id = icl.ration_card_id
       ${whereClause}
       ORDER BY icl.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return paginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
    } catch (err) {
        next(err);
    }
};

module.exports = { handleIncoming, getCallLogs };
