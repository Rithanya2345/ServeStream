/**
 * Shop Stock Routes
 */
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/shopStock.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

router.get(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    stockController.getStock
);

router.post(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    validate(schemas.updateStock),
    stockController.upsertStock
);

module.exports = router;
