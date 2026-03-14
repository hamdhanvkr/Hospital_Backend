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

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, timeSlot, status, symptoms } = req.body;

    console.log('📝 Updating appointment:', id);
    console.log('📅 New data:', { appointmentDate, timeSlot, status, symptoms });

    // Find the appointment
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if the new time slot is available (if date/time changed)
    if (appointmentDate || timeSlot) {
      const newDate = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
      const newTimeSlot = timeSlot || appointment.timeSlot;

      // Check for conflicts (excluding current appointment)
      const existingAppointment = await Appointment.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: newDate,
        timeSlot: newTimeSlot,
        _id: { $ne: id }
      });

      if (existingAppointment) {
        return res.status(400).json({ message: 'Selected time slot is already booked' });
      }
    }

    // Update fields
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (timeSlot) appointment.timeSlot = timeSlot;
    if (status) appointment.status = status;
    if (symptoms !== undefined) appointment.symptoms = symptoms;

    appointment.lastChangedAt = new Date();

    await appointment.save();

    console.log('✅ Appointment updated successfully');

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Make sure all functions are exported
module.exports = {
  addDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getAllAppointments,
  updateAppointment,
  addPatientManually
};