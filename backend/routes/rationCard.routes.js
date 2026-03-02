/**
 * Ration Card Routes
 */
const express = require('express');
const router = express.Router();
const cardController = require('../controllers/rationCard.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

router.get(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    cardController.getAll
);

router.get(
    '/:id',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    cardController.getById
);

router.post(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    validate(schemas.createCard),
    cardController.create
);

router.put(
    '/:id',
    authenticate,
    authorize('super_admin', 'district_admin', 'shop_operator'),
    validate(schemas.updateCard),
    cardController.update
);

module.exports = router;
