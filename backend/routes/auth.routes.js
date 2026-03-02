/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validateRequest');

// Public
router.post('/login', validate(schemas.login), authController.login);

// Protected — only super_admin can register new users
router.post(
    '/register',
    authenticate,
    authorize('super_admin'),
    validate(schemas.register),
    authController.register
);

// Protected — get own profile
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
