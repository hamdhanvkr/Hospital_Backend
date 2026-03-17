const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { sendConfirmationEmail } = require('../utils/emailService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment order',
      error: error.message 
    });
  }
};

// Verify payment signature
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointmentData
    } = req.body;

    // Generate signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    // Payment is verified, create appointment
    const userId = req.userId;
    const patient = await Patient.findOne({ userId });
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { doctorId, appointmentDate, timeSlot, symptoms } = appointmentData;

    // Check if doctor is available
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
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
      status: 'confirmed', // Auto-confirm after payment
      paymentInfo: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: doctor.consultationFee,
        status: 'paid',
        paidAt: new Date()
      }
    });

    // Send confirmation email
    try {
      const formatDateForDisplay = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };

      const formatTimeForDisplay = (time24) => {
        const [hours, minutes] = time24.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      };

      const appointmentDetails = {
        date: formatDateForDisplay(new Date(appointmentDate)),
        time: formatTimeForDisplay(timeSlot),
        symptoms: symptoms
      };

      await sendConfirmationEmail(
        patient.email,
        patient.fullName,
        doctor.name,
        appointmentDetails
      );
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail if email fails
    }

    res.json({
      success: true,
      message: 'Payment verified and appointment booked successfully',
      appointment
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Get payment details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails
};