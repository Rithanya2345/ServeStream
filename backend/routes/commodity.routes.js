/**
 * Commodity Routes
 */
const express = require('express');
const router = express.Router();
const commodityController = require('../controllers/commodity.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, commodityController.getAll);
router.get('/:id', authenticate, commodityController.getById);

router.post(
    '/',
    authenticate,
    authorize('super_admin'),
    commodityController.create
);

module.exports = router;
