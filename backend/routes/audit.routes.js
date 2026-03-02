/**
 * Audit Log Routes
 */
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Only super_admin, district_admin, and auditor can view audit logs
router.get(
    '/',
    authenticate,
    authorize('super_admin', 'district_admin', 'auditor'),
    auditController.getLogs
);

module.exports = router;
