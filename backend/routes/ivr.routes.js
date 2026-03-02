/**
 * IVR Routes
 * IVR incoming endpoint is UNAUTHENTICATED — validated by phone number.
 * Call logs query requires authentication.
 */
const express = require('express');
const router = express.Router();
const ivrController = require('../controllers/ivr.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

// Public — called by telephony provider / IVR simulator
router.post(
    '/incoming',
    validate(schemas.ivrIncoming),
    ivrController.handleIncoming
);

// Protected — call logs for admin/auditor
router.get(
    '/call-logs',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator', 'auditor'),
    ivrController.getCallLogs
);

module.exports = router;
