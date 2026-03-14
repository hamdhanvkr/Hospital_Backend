const express = require('express');
const router = express.Router();
const {
  getDoctorAppointments,
  updateAppointmentStatus,
  getTodayAppointments,
  getAppointmentStats,
  getAppointmentById,
  getAvailableSlotsForDoctor, // Add this import
  rescheduleAppointment
} = require('../controllers/doctorController');
const { authenticate, authorizeDoctor } = require('../middleware/auth');

// All routes require authentication and doctor role
router.use(authenticate, authorizeDoctor);

// Get all appointments
router.get('/appointments', getDoctorAppointments);

// Get single appointment
router.get('/appointment/:appointmentId', getAppointmentById);

// Get available slots for rescheduling - NEW ROUTE
router.get('/available-slots', getAvailableSlotsForDoctor);

// Get today's appointments
router.get('/appointments/today', getTodayAppointments);

// Get appointment statistics
router.get('/stats', getAppointmentStats);

// Update appointment status
router.put('/appointments/:appointmentId/status', updateAppointmentStatus);

// Reschedule appointment
router.put('/reschedule-appointment/:appointmentId', rescheduleAppointment);

module.exports = router;