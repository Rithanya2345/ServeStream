/**
 * District Routes
 */
const express = require('express');
const router = express.Router();
const districtController = require('../controllers/district.controller');
const { authenticate } = require('../middleware/auth');

// All district routes require authentication
router.get('/', authenticate, districtController.getAll);
router.get('/:id', authenticate, districtController.getById);
router.get('/:id/taluks', authenticate, districtController.getTaluks);

module.exports = router;
