const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');

// Add new doctor
const addDoctor = async (req, res) => {
  try {
    const doctorData = req.body;

    // Check if doctor with email already exists
    const existingDoctor = await Doctor.findOne({ email: doctorData.email });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this email already exists' });
    }

    // Create user account for doctor
    const user = await User.create({
      username: doctorData.email,
      password: 'doctor123', // Default password
      role: 'doctor'
    });

    // Create doctor profile
    const doctor = await Doctor.create({
      ...doctorData,
      userId: user._id
    });

    res.status(201).json({
      message: 'Doctor added successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByIdAndUpdate(id, req.body, { new: true });
    res.json({
      message: 'Doctor updated successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    await Doctor.findByIdAndDelete(id);
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all appointments with filters
const getAllAppointments = async (req, res) => {
  try {
    const { doctorId, date, status } = req.query;
    let query = {};

    if (doctorId) query.doctorId = doctorId;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('patientId')
      .populate('doctorId')
      .sort({ appointmentDate: -1, timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add patient manually (for admin use)
const addPatientManually = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, age, gender, address } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      password, // Plain text
      role: 'patient'
    });

    // Create patient profile
    const patient = await Patient.create({
      userId: user._id,
      fullName,
      email,
      phone,
      age,
      gender,
      address,
      isVerified: true // Auto-verified for manual addition
    });

    res.status(201).json({
      message: 'Patient added successfully',
      patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Make sure all functions are exported
module.exports = {
  addDoctor,
  getAllDoctors,
  updateDoctor,
  deleteDoctor,
  getAllAppointments,
  addPatientManually
};