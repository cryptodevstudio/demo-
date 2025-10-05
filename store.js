// backend/routes/store.js
const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const authMiddleware = require('../middleware/auth'); // your existing JWT auth middleware
const expressRaw = express.raw;

// Initiate a payment (user must be authenticated)
router.post('/initiate', authMiddleware, storeController.initiatePayment);

// Polling: check payment status
router.get('/status/:txId', authMiddleware, storeController.checkStatus);

// Webhook: provider -> POST here (no auth). Use raw body so we can verify signature.
// Many providers require raw body for signature verification.
router.post('/webhook', expressRaw({ type: 'application/json' }), storeController.webhookHandler);

module.exports = router;
