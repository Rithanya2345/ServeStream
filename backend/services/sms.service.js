/**
 * SMS Service — Twilio Integration
 * Sends booking confirmation and status update SMS to beneficiaries.
 */
const twilio = require('twilio');
const env = require('../config/env');

let client = null;

// Lazy-initialize Twilio client
const getClient = () => {
    if (!client && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return client;
};

/**
 * Send an SMS message via Twilio.
 * @param {string} to - Recipient phone number (E.164 format, e.g. +919876543210)
 * @param {string} body - Message text
 * @returns {Promise<object|null>} - Twilio message object or null if SMS is disabled
 */
const sendSMS = async (to, body) => {
    const twilioClient = getClient();

    if (!twilioClient) {
        console.warn('[SMS] Twilio not configured — skipping SMS');
        return null;
    }

    if (!to) {
        console.warn('[SMS] No recipient phone number — skipping SMS');
        return null;
    }

    try {
        const message = await twilioClient.messages.create({
            body,
            from: env.TWILIO_PHONE_NUMBER,
            to,
        });
        console.log(`[SMS] Sent to ${to} | SID: ${message.sid}`);
        return message;
    } catch (err) {
        // SMS failures should NOT break the booking flow
        console.error(`[SMS] Failed to send to ${to}:`, err.message);
        return null;
    }
};

/**
 * Send booking confirmation SMS.
 * @param {object} params
 * @param {string} params.phone - Beneficiary phone number
 * @param {string} params.tokenNumber - Generated token number
 * @param {number} params.queueNumber - Queue position
 * @param {string} params.shopName - Ration shop name
 * @param {string} params.bookingDate - Booking date string
 * @param {string} params.beneficiary - Head of family name
 */
const sendBookingConfirmation = async ({ phone, tokenNumber, queueNumber, shopName, bookingDate, beneficiary, estimatedTime }) => {
    const body = `Hi ${beneficiary}, Token ${tokenNumber} booked! Queue #${queueNumber}, visit at ${estimatedTime} on ${bookingDate}. Shop: ${shopName}. -ServeStream`;
    return sendSMS(phone, body);
};

/**
 * Send token cancellation SMS.
 */
const sendCancellationNotice = async ({ phone, tokenNumber, shopName, beneficiary }) => {
    const body = `Hi ${beneficiary}, Token ${tokenNumber} at ${shopName} cancelled. You can rebook anytime. -ServeStream`;
    return sendSMS(phone, body);
};

/**
 * Send token collection confirmation SMS.
 */
const sendCollectionConfirmation = async ({ phone, tokenNumber, shopName, beneficiary }) => {
    const body = `Hi ${beneficiary}, Ration collected for token ${tokenNumber} at ${shopName}. Thank you! -ServeStream`;
    return sendSMS(phone, body);
};

module.exports = {
    sendSMS,
    sendBookingConfirmation,
    sendCancellationNotice,
    sendCollectionConfirmation,
};
