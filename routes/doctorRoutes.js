const express = require('express');
const router = express.Router();
const {
  getDoctorAppointments,
  updateAppointmentStatus,
  getTodayAppointments,
  getAppointmentStats
} = require('../controllers/doctorController');
const { authenticate, authorizeDoctor } = require('../middleware/auth');

// All routes require authentication and doctor role
router.use(authenticate, authorizeDoctor);

// Get all appointments for the logged-in doctor
router.get('/appointments', getDoctorAppointments);

// Get today's appointments
router.get('/appointments/today', getTodayAppointments);

// Get appointment statistics
router.get('/stats', getAppointmentStats);

// Update appointment status
router.put('/appointments/:appointmentId/status', updateAppointmentStatus);

module.exports = router;