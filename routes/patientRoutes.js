const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  bookAppointment,
  getMyAppointments,
  getAvailableSlots
} = require('../controllers/patientController');
const { authenticate, authorizePatient } = require('../middleware/auth');

// Apply middleware to all routes
router.use(authenticate, authorizePatient);

// Define routes
router.get('/doctors', getAllDoctors);
router.get('/appointments', getMyAppointments);
router.get('/available-slots', getAvailableSlots);
router.post('/book-appointment', bookAppointment);

module.exports = router;