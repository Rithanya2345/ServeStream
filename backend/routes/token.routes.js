/**
 * Token Routes
 */
const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/token.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

router.get(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator', 'auditor'),
    tokenController.listTokens
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator', 'auditor'),
    tokenController.getById
);

router.post(
    '/book',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    validate(schemas.bookToken),
    tokenController.bookToken
);

router.patch(
    '/:id/status',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    validate(schemas.updateTokenStatus),
    tokenController.updateStatus
);

module.exports = router;
