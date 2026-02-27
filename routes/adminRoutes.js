const express = require('express');
const router = express.Router();
const {
  addDoctor,
  getAllDoctors,
  updateDoctor,
  deleteDoctor,
  getAllAppointments
} = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate, authorizeAdmin);

// Doctor management
router.post('/doctors', addDoctor);
router.get('/doctors', getAllDoctors);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Appointment management
router.get('/appointments', getAllAppointments);

module.exports = router;