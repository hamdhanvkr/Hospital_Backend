const express = require('express');
const router = express.Router();
const {
  addDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  updateAppointment,
  getAllAppointments
} = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate, authorizeAdmin);

// Doctor management
router.post('/doctors', addDoctor);
router.get('/doctors', getAllDoctors);
router.get('/doctors/:id', getDoctorById);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Appointment management
router.get('/appointments', getAllAppointments);
router.put('/appointments/:id', updateAppointment);

module.exports = router;