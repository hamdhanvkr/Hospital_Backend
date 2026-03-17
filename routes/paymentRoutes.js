const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentDetails
} = require('../controllers/paymentController');
const { authenticate, authorizePatient } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticate);

// Create payment order
router.post('/create-order', authorizePatient, createOrder);

// Verify payment and create appointment
router.post('/verify-payment', authorizePatient, verifyPayment);

// Get payment details
router.get('/:paymentId', authorizePatient, getPaymentDetails);

module.exports = router;