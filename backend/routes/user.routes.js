/**
 * User Management Routes
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin'),
    userController.getAll
);

router.patch(
    '/:id',
    authenticate,
    authorize('super_admin'),
    userController.update
);

module.exports = router;
