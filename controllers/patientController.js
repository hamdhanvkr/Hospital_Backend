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

// Book appointment with availability check

const bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, symptoms } = req.body;
    const userId = req.userId;

    // Get patient ID from user ID
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Get doctor details to check availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Parse the appointment date
    const selectedDate = new Date(appointmentDate);
    
    // Get day of week
    const dayOfWeek = selectedDate.getDay();
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = daysMap[dayOfWeek];

    console.log('📅 Selected day:', selectedDay);
    console.log('📋 Doctor available days:', doctor.availableDays);

    // Check if doctor is available on the selected day
    if (!doctor.availableDays || !doctor.availableDays.includes(selectedDay)) {
      return res.status(400).json({ 
        message: `Doctor is not available on ${selectedDay}. Available days: ${doctor.availableDays?.join(', ')}` 
      });
    }

    // Check if the selected time is within doctor's working hours
    const selectedTime = timeSlot; // Format: "HH:MM"
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const selectedTimeMinutes = hours * 60 + minutes;

    // Parse doctor's working hours
    const [startHours, startMinutes] = doctor.startTime.split(':').map(Number);
    const [endHours, endMinutes] = doctor.endTime.split(':').map(Number);
    
    const startTimeMinutes = startHours * 60 + startMinutes;
    const endTimeMinutes = endHours * 60 + endMinutes;

    console.log('⏰ Selected time:', selectedTime);
    console.log('🕐 Working hours:', doctor.startTime, '-', doctor.endTime);
    console.log('⏱️ Selected time minutes:', selectedTimeMinutes);
    console.log('⏱️ Start time minutes:', startTimeMinutes);
    console.log('⏱️ End time minutes:', endTimeMinutes);

    // FIXED CONDITION: Allow times that are LESS THAN OR EQUAL TO end time
    // This allows the slot that starts exactly at endTime (e.g., 15:30)
    if (selectedTimeMinutes < startTimeMinutes || selectedTimeMinutes > endTimeMinutes) {
      return res.status(400).json({ 
        message: `Doctor is only available between ${doctor.startTime} and ${doctor.endTime}` 
      });
    }

    // Check if slot is already booked
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

    console.log('✅ Appointment booked successfully at:', timeSlot);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('❌ Error booking appointment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get patient's appointments - THIS WAS MISSING!
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find patient by user ID
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Find all appointments for this patient
    const appointments = await Appointment.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        model: 'Doctor',
        select: 'name specialization email phone image'
      })
      .sort({ appointmentDate: -1, timeSlot: 1 });

    console.log(`📊 Found ${appointments.length} appointments for patient`);
    res.json(appointments);
  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available slots for a doctor on a specific date
// Get available slots for a doctor on a specific date
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    console.log('📅 Getting slots for doctor:', doctorId, 'date:', date);
    
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
    console.log('⏱️ Slot duration:', slotDuration, 'minutes');

    // Generate slots
    const slots = [];
    
    for (let minutes = startTimeMinutes; minutes < endTimeMinutes; minutes += slotDuration) {
      const slotHour = Math.floor(minutes / 60);
      const slotMinute = minutes % 60;
      
      // Format in 12-hour for display
      const ampm = slotHour >= 12 ? 'PM' : 'AM';
      let hour12 = slotHour % 12;
      hour12 = hour12 === 0 ? 12 : hour12;
      
      const minuteStr = slotMinute < 10 ? '0' + slotMinute : slotMinute;
      const timeString12 = `${hour12}:${minuteStr} ${ampm}`;
      
      slots.push(timeString12);
    }

    console.log('📋 Generated slots:', slots);

    // Get booked slots
    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: new Date(date),
      status: { $ne: 'cancelled' }
    });

    console.log('📋 Booked appointments:', bookedAppointments.length);

    // Convert booked slots to 12-hour format for comparison
    const bookedSlots = bookedAppointments.map(apt => {
      const [hours, minutes] = apt.timeSlot.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return `${hour12}:${minutesStr} ${ampm}`;
    });

    console.log('📋 Booked slots:', bookedSlots);

    // Mark available slots
    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot)
    }));

    console.log('📋 Final slots:', availableSlots);
    res.json(availableSlots);
  } catch (error) {
    console.error('❌ Error getting available slots:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllDoctors,
  bookAppointment,
  getMyAppointments, 
  getAvailableSlots
};











// const Doctor = require('../models/Doctor');
// const Appointment = require('../models/Appointment');
// const Patient = require('../models/Patient');

// // Get all doctors
// const getAllDoctors = async (req, res) => {
//   try {
//     const doctors = await Doctor.find({});
//     res.json(doctors);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Book appointment
// const bookAppointment = async (req, res) => {
//   try {
//     const { doctorId, appointmentDate, timeSlot, symptoms } = req.body;
//     const userId = req.userId;

//     // Get patient ID from user ID
//     const patient = await Patient.findOne({ userId });
//     if (!patient) {
//       return res.status(404).json({ message: 'Patient not found' });
//     }

//     // Check if slot is available
//     const existingAppointment = await Appointment.findOne({
//       doctorId,
//       appointmentDate: new Date(appointmentDate),
//       timeSlot
//     });

//     if (existingAppointment) {
//       return res.status(400).json({ message: 'Time slot already booked' });
//     }

//     // Create appointment
//     const appointment = await Appointment.create({
//       patientId: patient._id,
//       doctorId,
//       appointmentDate: new Date(appointmentDate),
//       timeSlot,
//       symptoms,
//       status: 'pending'
//     });

//     res.status(201).json({
//       message: 'Appointment booked successfully',
//       appointment
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get patient's appointments
// const getMyAppointments = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const patient = await Patient.findOne({ userId });

//     const appointments = await Appointment.find({ patientId: patient._id })
//       .populate('doctorId')
//       .sort({ appointmentDate: -1, timeSlot: 1 });

//     res.json(appointments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get available slots for a doctor on a specific date
// const getAvailableSlots = async (req, res) => {
//   try {
//     const { doctorId, date } = req.query;
//     const doctor = await Doctor.findById(doctorId);

//     if (!doctor) {
//       return res.status(404).json({ message: 'Doctor not found' });
//     }

//     // Generate all possible slots (9:30 AM to 3:30 PM, 30 min intervals)
//     const slots = [];
//     const startTime = new Date(`1970-01-01T${doctor.startTime || '09:30'}:00`);
//     const endTime = new Date(`1970-01-01T${doctor.endTime || '15:30'}:00`);

//     for (let time = startTime; time < endTime; time.setMinutes(time.getMinutes() + (doctor.slotDuration || 30))) {
//       const timeString = time.toTimeString().substring(0, 5);
//       slots.push(timeString);
//     }

//     // Get booked slots
//     const bookedAppointments = await Appointment.find({
//       doctorId,
//       appointmentDate: new Date(date),
//       status: { $ne: 'cancelled' }
//     });

//     const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);

//     // Mark available slots
//     const availableSlots = slots.map(slot => ({
//       time: slot,
//       available: !bookedSlots.includes(slot)
//     }));

//     res.json(availableSlots);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// module.exports = {
//   getAllDoctors,
//   bookAppointment,
//   getMyAppointments,
//   getAvailableSlots
// };


