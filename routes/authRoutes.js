const express = require('express');
const router = express.Router();
const {
  sendOTPForRegistration,
  verifyOTPAndCreateUser,
  resendOTPHandler,
  login,
  verifyUser,
  changePassword,
  logout
} = require('../controllers/authController');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

// Auth routes - Make sure ALL these are present
router.post('/send-otp', sendOTPForRegistration);
router.post('/verify-otp', verifyOTPAndCreateUser);
router.post('/resend-otp', resendOTPHandler);
router.post('/login', login);
router.post('/logout', logout);

// Change password flow - THESE MUST BE HERE
router.post('/verify-user', verifyUser);
router.post('/change-password', changePassword);

// DEBUG ROUTES
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({});
    const doctors = await Doctor.find({});
    const patients = await Patient.find({});
    
    res.json({
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        password: u.password,
        role: u.role
      })),
      doctors: doctors.map(d => ({
        id: d._id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        specialization: d.specialization
      })),
      patients: patients.map(p => ({
        id: p._id,
        name: p.fullName,
        email: p.email,
        phone: p.phone,
        isVerified: p.isVerified
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/debug/check-user/:email/:phone', async (req, res) => {
  try {
    const { email, phone } = req.params;
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log('🔍 Debug: Checking user with email:', email, 'phone:', cleanPhone);
    
    const patient = await Patient.findOne({ 
      email: email, 
      phone: cleanPhone 
    });
    
    const doctor = await Doctor.findOne({ 
      email: email, 
      phone: cleanPhone 
    });
    
    const result = {
      searched: {
        email: email,
        phone: cleanPhone
      },
      patient: patient ? { 
        id: patient._id, 
        name: patient.fullName,
        email: patient.email, 
        phone: patient.phone,
        userId: patient.userId
      } : null,
      doctor: doctor ? { 
        id: doctor._id, 
        name: doctor.name,
        email: doctor.email, 
        phone: doctor.phone 
      } : null
    };
    
    console.log('✅ Debug result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;













// const express = require('express');
// const router = express.Router();
// const {
//   registerPatient,
//   verifyOTPHandler,
//   login,
//   logout
// } = require('../controllers/authController');
// const User = require('../models/User');
// const Patient = require('../models/Patient');
// const Doctor = require('../models/Doctor');

// // Auth routes
// router.post('/register/patient', registerPatient);
// router.post('/verify-otp', verifyOTPHandler);
// router.post('/login', login);
// router.post('/logout', logout);

// // DEBUG ROUTES - Remove in production
// router.get('/debug/users', async (req, res) => {
//   try {
//     const users = await User.find({});
//     const doctors = await Doctor.find({});
//     const patients = await Patient.find({});
    
//     res.json({
//       users: users.map(u => ({
//         id: u._id,
//         username: u.username,
//         password: u.password,
//         role: u.role
//       })),
//       doctors: doctors.map(d => ({
//         id: d._id,
//         name: d.name,
//         email: d.email,
//         specialization: d.specialization
//       })),
//       patients: patients.map(p => ({
//         id: p._id,
//         name: p.fullName,
//         phone: p.phone
//       }))
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// router.get('/debug/doctor/:email', async (req, res) => {
//   try {
//     const email = req.params.email;
    
//     // Find doctor by email
//     const doctor = await Doctor.findOne({ email });
//     if (!doctor) {
//       return res.status(404).json({ message: 'Doctor not found' });
//     }
    
//     // Find associated user
//     const user = await User.findOne({ username: email, role: 'doctor' });
    
//     res.json({
//       doctor: {
//         id: doctor._id,
//         name: doctor.name,
//         email: doctor.email,
//         specialization: doctor.specialization,
//         phone: doctor.phone
//       },
//       user: user ? {
//         id: user._id,
//         username: user.username,
//         password: user.password,
//         role: user.role
//       } : 'No user account found for this doctor'
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;









// const express = require('express');
// const router = express.Router();
// const {
//   registerPatient,
//   verifyOTPHandler,
//   resendOTPHandler,
//   login,
//   logout
// } = require('../controllers/authController');
// const User = require('../models/User');
// const Patient = require('../models/Patient');
// const Doctor = require('../models/Doctor');

// // Auth routes
// router.post('/register/patient', registerPatient);
// router.post('/verify-otp', verifyOTPHandler);
// router.post('/resend-otp', resendOTPHandler);
// router.post('/login', login);
// router.post('/logout', logout);

// // DEBUG ROUTES - Remove in production
// router.get('/debug/users', async (req, res) => {
//   try {
//     const users = await User.find({});
//     const doctors = await Doctor.find({});
//     const patients = await Patient.find({});
    
//     res.json({
//       users: users.map(u => ({
//         id: u._id,
//         username: u.username,
//         password: u.password,
//         role: u.role
//       })),
//       doctors: doctors.map(d => ({
//         id: d._id,
//         name: d.name,
//         email: d.email,
//         specialization: d.specialization
//       })),
//       patients: patients.map(p => ({
//         id: p._id,
//         name: p.fullName,
//         phone: p.phone,
//         isVerified: p.isVerified
//       }))
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// router.get('/debug/doctor/:email', async (req, res) => {
//   try {
//     const email = req.params.email;
    
//     const doctor = await Doctor.findOne({ email });
//     if (!doctor) {
//       return res.status(404).json({ message: 'Doctor not found' });
//     }
    
//     const user = await User.findOne({ username: email, role: 'doctor' });
    
//     res.json({
//       doctor: {
//         id: doctor._id,
//         name: doctor.name,
//         email: doctor.email,
//         specialization: doctor.specialization,
//         phone: doctor.phone
//       },
//       user: user ? {
//         id: user._id,
//         username: user.username,
//         password: user.password,
//         role: user.role
//       } : 'No user account found for this doctor'
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// module.exports = router;