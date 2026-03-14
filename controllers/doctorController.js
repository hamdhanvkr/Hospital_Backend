const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { sendRescheduleEmail } = require('../utils/emailService');

// Get doctor's appointments (only for the logged-in doctor)
// Get doctor's appointments (NOW INCLUDES CANCELLED)
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.doctorId;
    
    console.log('🔍 Fetching appointments for doctor ID:', doctorId);

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found' });
    }

    // REMOVED THE STATUS FILTER - NOW GETS ALL APPOINTMENTS
    const appointments = await Appointment.find({ doctorId: doctorId })
    .populate({
      path: 'patientId',
      model: 'Patient',
      select: 'fullName email phone age gender address'
    })
    .sort({ appointmentDate: -1, timeSlot: 1 });

    console.log(`📊 Found ${appointments.length} appointments total`);
    console.log(`📊 Status breakdown:`, {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      rescheduled: appointments.filter(a => a.isRescheduled).length
    });

    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      timeSlot: apt.timeSlot,
      status: apt.status,
      symptoms: apt.symptoms,
      isRescheduled: apt.isRescheduled,
      rescheduleReason: apt.rescheduleReason,
      originalAppointmentDate: apt.originalAppointmentDate,
      originalTimeSlot: apt.originalTimeSlot,
      createdAt: apt.createdAt,
      patientId: apt.patientId ? {
        _id: apt.patientId._id,
        fullName: apt.patientId.fullName || 'Unknown',
        email: apt.patientId.email || 'No email',
        phone: apt.patientId.phone || 'No phone',
        age: apt.patientId.age || 'N/A',
        gender: apt.patientId.gender || 'N/A',
        address: apt.patientId.address || 'No address'
      } : null
    }));

    res.json(formattedAppointments);
  } catch (error) {
    console.error('❌ Error in getDoctorAppointments:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const doctorId = req.doctorId;

    console.log(`📝 Updating appointment ${appointmentId} to status: ${status}`);

    // First verify this appointment belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctorId
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or not authorized' });
    }

    // Update the status
    appointment.status = status;
    await appointment.save();

    console.log('✅ Appointment status updated successfully');

    res.json({
      message: 'Appointment status updated',
      appointment
    });
  } catch (error) {
    console.error('❌ Error in updateAppointmentStatus:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get doctor's today's appointments
const getTodayAppointments = async (req, res) => {
  try {
    const doctorId = req.doctorId;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      doctorId: doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('patientId')
    .sort({ timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error in getTodayAppointments:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get doctor's appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    const doctorId = req.doctorId;

    const totalAppointments = await Appointment.countDocuments({ doctorId });
    
    const pendingAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'pending' 
    });
    
    const confirmedAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'confirmed' 
    });
    
    const completedAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'completed' 
    });
    
    const cancelledAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'cancelled' 
    });

    // Get today's appointments count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      total: totalAppointments,
      pending: pendingAppointments,
      confirmed: confirmedAppointments,
      completed: completedAppointments,
      cancelled: cancelledAppointments,
      today: todayAppointments
    });
  } catch (error) {
    console.error('Error in getAppointmentStats:', error);
    res.status(500).json({ message: error.message });
  }
};


// Get single appointment details
const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.doctorId;

    console.log(`🔍 Fetching single appointment ${appointmentId} for doctor ${doctorId}`);

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctorId
    }).populate('patientId').populate('doctorId');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    console.log('✅ Appointment found:', appointment._id);
    res.json(appointment);
  } catch (error) {
    console.error('❌ Error in getAppointmentById:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reschedule appointment with reason
const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newDate, newTimeSlot, reason } = req.body;
    const doctorId = req.doctorId;

    console.log(`🔄 Rescheduling appointment ${appointmentId}`);
    console.log(`📅 New date: ${newDate}, New time: ${newTimeSlot}`);
    console.log(`📝 Reason: ${reason}`);

    // Find the appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctorId
    }).populate('patientId').populate('doctorId');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if new slot is available
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: new Date(newDate),
      timeSlot: newTimeSlot,
      _id: { $ne: appointmentId }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Selected time slot is already booked' });
    }

    // Save original details
    const originalDate = appointment.appointmentDate;
    const originalSlot = appointment.timeSlot;
    const patientPhone = appointment.patientId?.phone;
    const patientEmail = appointment.patientId?.email; // Get patient email
    const patientName = appointment.patientId?.fullName;
    const doctorName = appointment.doctorId?.name;

    // Format dates for display
    const formatDateForDisplay = (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    const formatTimeForDisplay = (time24) => {
      const [hours, minutes] = time24.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const originalDateStr = formatDateForDisplay(originalDate);
    const originalTimeStr = formatTimeForDisplay(originalSlot);
    const newDateStr = formatDateForDisplay(new Date(newDate));
    const newTimeStr = formatTimeForDisplay(newTimeSlot);

    // Update appointment
    appointment.appointmentDate = new Date(newDate);
    appointment.timeSlot = newTimeSlot;
    appointment.status = 'rescheduled';
    appointment.isRescheduled = true;
    appointment.rescheduleReason = reason;
    appointment.rescheduledBy = 'doctor';
    appointment.originalAppointmentDate = originalDate;
    appointment.originalTimeSlot = originalSlot;
    
    // Add to history
    if (!appointment.rescheduleHistory) {
      appointment.rescheduleHistory = [];
    }
    
    appointment.rescheduleHistory.push({
      rescheduledAt: new Date(),
      reason: reason,
      rescheduledBy: 'doctor',
      fromDate: originalDate,
      fromSlot: originalSlot,
      toDate: new Date(newDate),
      toSlot: newTimeSlot
    });

    await appointment.save();

    // Send SMS notification to patient
    if (patientPhone) {
      try {
        const smsMessage = `ABC Hospital: Your appointment with Dr. ${doctorName} RESCHEDULED. Reason: ${reason}. From: ${originalDateStr} ${originalTimeStr} To: ${newDateStr} ${newTimeStr}`;
        await sendSMS(patientPhone, smsMessage);
        console.log('✅ Reschedule SMS sent to patient');
      } catch (smsError) {
        console.error('❌ Failed to send SMS:', smsError.message);
      }
    }

    // ✅ Send EMAIL notification to patient
    if (patientEmail) {
      try {
        const emailDetails = {
          originalDate: originalDateStr,
          originalTime: originalTimeStr,
          newDate: newDateStr,
          newTime: newTimeStr,
          reason: reason
        };
        
        await sendRescheduleEmail(patientEmail, patientName, doctorName, emailDetails);
        console.log('✅ Reschedule email sent to patient:', patientEmail);
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError.message);
      }
    }

    console.log(`✅ Appointment ${appointmentId} rescheduled by doctor`);
    console.log(`📝 Reason: ${reason}`);
    console.log(`📅 From: ${originalDateStr} ${originalTimeStr} → To: ${newDateStr} ${newTimeStr}`);

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error rescheduling appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available slots for rescheduling (doctor version)
// Get available slots for rescheduling (doctor version)
const getAvailableSlotsForDoctor = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    const requestingDoctorId = req.doctorId;

    console.log('🔍 Getting available slots for doctor:', doctorId, 'date:', date);

    // Convert both to strings for comparison
    if (doctorId.toString() !== requestingDoctorId.toString()) {
      console.log('❌ Doctor ID mismatch - forbidden');
      return res.status(403).json({ message: 'You can only view your own slots' });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      console.log('❌ Doctor not found');
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Parse the selected date
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = daysMap[dayOfWeek];

    console.log('📅 Selected day:', selectedDay);
    console.log('📋 Doctor available days:', doctor.availableDays);

    // Check if doctor is available on this day
    const isDoctorAvailable = doctor.availableDays?.includes(selectedDay);

    if (!isDoctorAvailable) {
      console.log('❌ Doctor not available on this day');
      return res.json([]);
    }

    // Parse start and end times
    const [startHour, startMinute] = doctor.startTime.split(':').map(Number);
    const [endHour, endMinute] = doctor.endTime.split(':').map(Number);
    
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    
    const slotDuration = doctor.slotDuration || 30;

    console.log('⏰ Working hours:', doctor.startTime, '-', doctor.endTime);
    console.log('⏱️ Start minutes:', startTimeMinutes, 'End minutes:', endTimeMinutes);
    console.log('⏱️ Slot duration:', slotDuration, 'minutes');

    // Generate slots - FIXED: Use <= to include the end time
    const slots = [];
    
    // For a 30-minute slot, the last appointment that starts at 15:30 ends at 16:00
    // So we want to include slots where start time <= end time
    for (let minutes = startTimeMinutes; minutes <= endTimeMinutes; minutes += slotDuration) {
      const slotHour = Math.floor(minutes / 60);
      const slotMinute = minutes % 60;
      
      // Skip if we go beyond 24 hours (safety check)
      if (slotHour >= 24) break;
      
      // Format in 12-hour for display
      const ampm = slotHour >= 12 ? 'PM' : 'AM';
      let hour12 = slotHour % 12;
      hour12 = hour12 === 0 ? 12 : hour12;
      
      const minuteStr = slotMinute < 10 ? '0' + slotMinute : slotMinute;
      const timeString12 = `${hour12}:${minuteStr} ${ampm}`;
      
      slots.push(timeString12);
      
      console.log(`✅ Added slot: ${timeString12} (${slotHour}:${slotMinute})`);
    }

    console.log('📋 Generated slots total:', slots.length);
    console.log('📋 All slots:', slots);

    // Get booked slots
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: new Date(date),
      status: { $ne: 'cancelled' }
    });

    console.log('📋 Booked appointments:', bookedAppointments.length);

    // Convert booked slots to 12-hour format
    const bookedSlots = bookedAppointments.map(apt => {
      const [hours, minutes] = apt.timeSlot.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const time12 = `${hour12}:${minutesStr} ${ampm}`;
      console.log(`📅 Booked: ${apt.timeSlot} -> ${time12}`);
      return time12;
    });

    console.log('📋 Booked slots (12hr):', bookedSlots);

    // Mark available slots
    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot)
    }));

    console.log('📋 Final available slots:', availableSlots.filter(s => s.available).map(s => s.time));
    console.log('📋 Final booked slots:', availableSlots.filter(s => !s.available).map(s => s.time));

    res.json(availableSlots);
  } catch (error) {
    console.error('❌ Error getting available slots:', error);
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  getDoctorAppointments,
  updateAppointmentStatus,
  getTodayAppointments,
  getAppointmentStats,
  getAppointmentById,  
  rescheduleAppointment,
  getAvailableSlotsForDoctor
};