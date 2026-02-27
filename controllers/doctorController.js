const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// Get doctor's appointments (only for the logged-in doctor)
const getDoctorAppointments = async (req, res) => {
  try {
    // Get doctor ID from the authenticated user
    const doctorId = req.doctorId;
    
    console.log('🔍 Fetching appointments for doctor ID:', doctorId);

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID not found' });
    }

    // Find all appointments for this specific doctor
    const appointments = await Appointment.find({ 
      doctorId: doctorId,
      status: { $ne: 'cancelled' } // Exclude cancelled appointments if you want
    })
    .populate({
      path: 'patientId',
      model: 'Patient',
      select: 'fullName email phone age gender address' // Select specific fields
    })
    .sort({ appointmentDate: -1, timeSlot: 1 }); // Sort by date descending, time ascending

    console.log(`📊 Found ${appointments.length} appointments for doctor`);

    // Format the response to ensure patient data is properly structured
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      timeSlot: apt.timeSlot,
      status: apt.status,
      symptoms: apt.symptoms,
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

module.exports = {
  getDoctorAppointments,
  updateAppointmentStatus,
  getTodayAppointments,
  getAppointmentStats
};