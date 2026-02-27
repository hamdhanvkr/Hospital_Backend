const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Book appointment
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, symptoms } = req.body;
    const userId = req.userId;

    // Get patient ID from user ID
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: new Date(appointmentDate),
      timeSlot
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      symptoms,
      status: 'pending'
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get patient's appointments
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    const patient = await Patient.findOne({ userId });

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId')
      .sort({ appointmentDate: -1, timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available slots for a doctor on a specific date
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Generate all possible slots (9:30 AM to 3:30 PM, 30 min intervals)
    const slots = [];
    const startTime = new Date(`1970-01-01T${doctor.startTime || '09:30'}:00`);
    const endTime = new Date(`1970-01-01T${doctor.endTime || '15:30'}:00`);

    for (let time = startTime; time < endTime; time.setMinutes(time.getMinutes() + (doctor.slotDuration || 30))) {
      const timeString = time.toTimeString().substring(0, 5);
      slots.push(timeString);
    }

    // Get booked slots
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: new Date(date),
      status: { $ne: 'cancelled' }
    });

    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);

    // Mark available slots
    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot)
    }));

    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllDoctors,
  bookAppointment,
  getMyAppointments,
  getAvailableSlots
};