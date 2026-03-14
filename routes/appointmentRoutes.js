const express = require('express');
const router = express.Router();
const {
  getChangePolicy,
  canChangeAppointment,
  changeAppointment,
  cancelAppointment
} = require('../controllers/appointmentController');
const { authenticate, authorizePatient } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get change policy (public)
router.get('/policy', getChangePolicy);

// Check if appointment can be changed (patient only)
router.get('/can-change/:appointmentId', authorizePatient, canChangeAppointment);

// Change appointment (patient only)
router.put('/change/:appointmentId', authorizePatient, changeAppointment);

// Cancel appointment (patient only)
router.put('/cancel/:appointmentId', authorizePatient, cancelAppointment);

module.exports = router;