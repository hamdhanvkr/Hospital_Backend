const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// Get change policy/terms
const getChangePolicy = async (req, res) => {
  const policy = {
    canChange: true,
    changeWindowHours: 48, // 2 days in hours
    changeWindowDays: 2, // 2 days
    message: "You can change or cancel your appointment up to 2 days before the scheduled date.",
    restrictions: [
      "Changes allowed only up to 48 hours before appointment",
      "Only 1 change allowed per appointment",
      "New date must be within doctor's available days",
      "New time slot must be available"
    ]
  };
  res.json(policy);
};

// Check if appointment can be changed
const canChangeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    
    // Calculate difference in hours
    const diffTime = appointmentDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    
    // Check if within 2 days (48 hours)
    const canChange = diffHours > 48;
    
    // Check if already changed once
    const hasChanged = appointment.changeHistory && appointment.changeHistory.length > 0;
    
    // Check if appointment is not cancelled or completed
    const isActive = ['pending', 'confirmed'].includes(appointment.status);
    
    const response = {
      canChange: canChange && !hasChanged && isActive,
      reason: !canChange ? "Appointments can only be changed up to 2 days before the scheduled date" :
              hasChanged ? "You can only change an appointment once" :
              !isActive ? "This appointment cannot be changed" :
              "You can change this appointment",
      hoursUntilAppointment: Math.floor(diffHours),
      daysUntilAppointment: Math.floor(diffHours / 24),
      hasChanged,
      status: appointment.status
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change appointment date/time
const changeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTimeSlot } = req.body;
    const userId = req.userId;
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Verify this appointment belongs to the patient
    const patient = await Patient.findOne({ userId });
    if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({ message: 'You can only change your own appointments' });
    }
    
    // Check if appointment can be changed
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const diffHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 48) {
      return res.status(400).json({ 
        message: 'Appointments can only be changed up to 2 days before the scheduled date' 
      });
    }
    
    // Check if already changed once
    if (appointment.changeHistory && appointment.changeHistory.length > 0) {
      return res.status(400).json({ 
        message: 'You can only change an appointment once' 
      });
    }
    
    // Check if appointment is in valid state
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ 
        message: `Cannot change appointment with status: ${appointment.status}` 
      });
    }
    
    // Get doctor details to check availability
    const doctor = await Doctor.findById(appointment.doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if new date is valid
    const newDateObj = new Date(newDate);
    const dayOfWeek = newDateObj.getDay();
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = daysMap[dayOfWeek];
    
    if (!doctor.availableDays.includes(selectedDay)) {
      return res.status(400).json({ 
        message: `Doctor is not available on ${selectedDay}` 
      });
    }
    
    // Check if new time slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: newDateObj,
      timeSlot: newTimeSlot,
      _id: { $ne: appointmentId } // Exclude current appointment
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Selected time slot is already booked' });
    }
    
    // FIX: Initialize changeHistory if it doesn't exist
    if (!appointment.changeHistory) {
      appointment.changeHistory = [];
    }
    
    // Save change history
    appointment.changeHistory.push({
      changedAt: new Date(),
      previousDate: appointment.appointmentDate,
      previousTimeSlot: appointment.timeSlot,
      newDate: newDateObj,
      newTimeSlot: newTimeSlot,
      changedBy: 'patient'
    });
    
    // Update appointment
    appointment.appointmentDate = newDateObj;
    appointment.timeSlot = newTimeSlot;
    appointment.lastChangedAt = new Date();
    appointment.status = 'pending'; // Reset to pending for doctor confirmation
    
    await appointment.save();
    
    res.json({
      message: 'Appointment changed successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error changing appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Cancel appointment with terms
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId;
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Verify ownership
    const patient = await Patient.findOne({ userId });
    if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own appointments' });
    }
    
    // Check cancellation terms
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const diffHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let cancellationFee = 0;
    let message = 'Appointment cancelled successfully';
    
    if (diffHours <= 24) {
      cancellationFee = 100;
      message = 'Appointment cancelled. A cancellation fee of ₹100 will be applied.';
    } else if (diffHours <= 48) {
      cancellationFee = 50;
      message = 'Appointment cancelled. A cancellation fee of ₹50 will be applied.';
    }
    
    appointment.status = 'cancelled';
    appointment.lastChangedAt = new Date();
    
    // FIX: Initialize changeHistory if it doesn't exist
    if (!appointment.changeHistory) {
      appointment.changeHistory = [];
    }
    
    // Add to change history
    appointment.changeHistory.push({
      changedAt: new Date(),
      previousDate: appointment.appointmentDate,
      previousTimeSlot: appointment.timeSlot,
      changedBy: 'patient',
      action: 'cancelled'
    });
    
    await appointment.save();
    
    res.json({
      message,
      cancellationFee,
      appointment
    });
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getChangePolicy,
  canChangeAppointment,
  changeAppointment,
  cancelAppointment
};