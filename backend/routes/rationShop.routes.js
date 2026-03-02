/**
 * Ration Shop Routes
 */
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/rationShop.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

router.get('/', authenticate, shopController.getAll);
router.get('/:id', authenticate, shopController.getById);

// Only super_admin and district_admin can create/update shops
router.post(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin'),
    validate(schemas.createShop),
    shopController.create
);

router.put(
    '/:id',
    authenticate,
    authorize('super_admin', 'district_admin'),
    validate(schemas.updateShop),
    shopController.update
);

module.exports = router;
