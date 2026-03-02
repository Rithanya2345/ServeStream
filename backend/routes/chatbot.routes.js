const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');

// Public routes for Chatbot (Beneficiary Access)

// POST /api/chatbot/card-details - Get shop/area info by card number
router.post('/card-details', chatbotController.getCardDetails);

// POST /api/chatbot/book - Book a token
router.post('/book', chatbotController.bookToken);

// POST /api/chatbot/status - Check token status
router.post('/status', chatbotController.checkStatus);

// POST /api/chatbot/history - Get booking history
router.post('/history', chatbotController.getBookingHistory);

module.exports = router;
