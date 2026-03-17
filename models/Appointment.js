const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  symptoms: String,
  
  // Payment information
  paymentInfo: {
    orderId: String,
    paymentId: String,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    refundedAt: Date
  },
  
  // Reschedule tracking
  isRescheduled: {
    type: Boolean,
    default: false
  },
  rescheduleReason: {
    type: String,
    default: ''
  },
  rescheduledBy: {
    type: String,
    enum: ['doctor', 'admin', 'patient'],
    default: 'patient'
  },
  originalAppointmentDate: Date,
  originalTimeSlot: String,
  
  rescheduleHistory: {
    type: [{
      rescheduledAt: Date,
      reason: String,
      rescheduledBy: String,
      fromDate: Date,
      fromSlot: String,
      toDate: Date,
      toSlot: String
    }],
    default: []
  },
  
  changeHistory: {
    type: [{
      changedAt: Date,
      reason: String,
      changedBy: String,
      fromDate: Date,
      fromSlot: String,
      toDate: Date,
      toSlot: String,
      action: String
    }],
    default: []
  },
  
  bookedAt: {
    type: Date,
    default: Date.now
  },
  lastChangedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);