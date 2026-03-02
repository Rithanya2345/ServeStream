/**
 * Request Validation Middleware
 * Uses Joi schemas to validate req.body, req.params, or req.query.
 *
 * Usage:
 *   const { validate, schemas } = require('../middleware/validateRequest');
 *   router.post('/tokens', validate(schemas.bookToken), controller.bookToken);
 */
const Joi = require('joi');

/**
 * Factory that returns Express middleware to validate a specific part of the request.
 * @param {Joi.ObjectSchema} schema  Joi schema to validate against
 * @param {'body'|'params'|'query'} source  Which req property to validate (default: 'body')
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,    // Return all errors, not just the first
            stripUnknown: true,   // Remove fields not in the schema
            allowUnknown: false,
        });

        if (error) {
            const messages = error.details.map((d) => d.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: messages,
            });
        }

        // Replace request data with sanitised/validated values
        req[source] = value;
        next();
    };
};

// ─────────────────────────────────────────────
// Reusable Joi Schemas
// ─────────────────────────────────────────────
const schemas = {
    // Auth
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    }),

    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        full_name: Joi.string().max(100).required(),
        full_name_ta: Joi.string().max(100).allow('', null),
        phone: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
        role: Joi.string().valid('super_admin', 'district_admin', 'shop_operator', 'auditor').required(),
        shop_id: Joi.string().uuid().allow(null),
        district_id: Joi.string().uuid().allow(null),
    }),

    // Ration Shop
    createShop: Joi.object({
        taluk_id: Joi.string().uuid().required(),
        shop_code: Joi.string().max(20).required(),
        name: Joi.string().max(150).required(),
        name_ta: Joi.string().max(150).allow('', null),
        address: Joi.string().allow('', null),
        pincode: Joi.string().pattern(/^[0-9]{6}$/).allow('', null),
        latitude: Joi.number().min(-90).max(90).allow(null),
        longitude: Joi.number().min(-180).max(180).allow(null),
        ivr_phone_number: Joi.string().max(15).required(),
        operator_name: Joi.string().max(100).allow('', null),
        operator_phone: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
        operating_hours: Joi.string().max(50).allow('', null),
    }),

    updateShop: Joi.object({
        name: Joi.string().max(150),
        name_ta: Joi.string().max(150).allow('', null),
        address: Joi.string().allow('', null),
        pincode: Joi.string().pattern(/^[0-9]{6}$/).allow('', null),
        latitude: Joi.number().min(-90).max(90).allow(null),
        longitude: Joi.number().min(-180).max(180).allow(null),
        operator_name: Joi.string().max(100).allow('', null),
        operator_phone: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
        operating_hours: Joi.string().max(50).allow('', null),
        is_active: Joi.boolean(),
    }),

    // Ration Card
    createCard: Joi.object({
        shop_id: Joi.string().uuid().required(),
        card_number: Joi.string().max(20).required(),
        card_type: Joi.string().valid('AAY', 'PHH', 'NPHH', 'AY').default('PHH'),
        head_of_family: Joi.string().max(100).required(),
        head_of_family_ta: Joi.string().max(100).allow('', null),
        mobile_number: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
        address: Joi.string().allow('', null),
        total_members: Joi.number().integer().min(1).default(1),
    }),

    updateCard: Joi.object({
        card_type: Joi.string().valid('AAY', 'PHH', 'NPHH', 'AY'),
        head_of_family: Joi.string().max(100),
        head_of_family_ta: Joi.string().max(100).allow('', null),
        mobile_number: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
        address: Joi.string().allow('', null),
        total_members: Joi.number().integer().min(1),
        is_active: Joi.boolean(),
    }),

    // Family Member
    createFamilyMember: Joi.object({
        ration_card_id: Joi.string().uuid().required(),
        name: Joi.string().max(100).required(),
        name_ta: Joi.string().max(100).allow('', null),
        age: Joi.number().integer().min(0).max(150).allow(null),
        gender: Joi.string().valid('male', 'female', 'other').allow(null),
        relationship: Joi.string().max(50).allow('', null),
        aadhaar_last4: Joi.string().pattern(/^[0-9]{4}$/).allow('', null),
    }),

    // Token Booking
    bookToken: Joi.object({
        ration_card_id: Joi.string().uuid().required(),
        shop_id: Joi.string().uuid().required(),
        collection_date: Joi.date().iso().allow(null),
        booked_via: Joi.string().valid('ivr', 'admin', 'mobile', 'walk_in').default('admin'),
    }),

    updateTokenStatus: Joi.object({
        status: Joi.string().valid('confirmed', 'collected', 'cancelled', 'expired').required(),
        cancel_reason: Joi.string().max(500).when('status', {
            is: 'cancelled',
            then: Joi.string().required(),
            otherwise: Joi.string().allow('', null),
        }),
    }),

    // Shop Stock
    updateStock: Joi.object({
        shop_id: Joi.string().uuid().required(),
        commodity_id: Joi.string().uuid().required(),
        month: Joi.number().integer().min(1).max(12).required(),
        year: Joi.number().integer().min(2020).required(),
        allocated_qty: Joi.number().min(0).required(),
        distributed_qty: Joi.number().min(0).default(0),
    }),

    // IVR Incoming Call
    // IVR Incoming Call
    ivrIncoming: Joi.object({
        // Standard Twilio/Telephony params
        To: Joi.string().allow('', null),
        From: Joi.string().allow('', null),
        Digits: Joi.string().allow('', null),
        CallSid: Joi.string().allow('', null),

        // Legacy/Internal params
        ivr_phone: Joi.string().max(15).allow('', null),
        caller_number: Joi.string().max(15).allow('', null),
        dtmf_input: Joi.string().max(50).allow('', null),
        action: Joi.string().allow('', null), // No longer required, inferred by controller
        card_number: Joi.string().max(20).allow('', null),
        call_sid: Joi.string().max(100).allow('', null),
    }).unknown(true), // Allow other Twilio params like ApiVersion, Direction etc.

    // UUID param validation
    uuidParam: Joi.object({
        id: Joi.string().uuid().required(),
    }),
};

module.exports = { validate, schemas };
