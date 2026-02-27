const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor'); // ADD THIS IMPORT
const { generateOTP, storeOTP, sendOTP, verifyOTP } = require('../utils/otpService');

// Patient Registration with OTP
const registerPatient = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, age, gender, address } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if phone already registered
    const existingPatient = await Patient.findOne({ phone });
    if (existingPatient) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create user
    const user = await User.create({
      username,
      password, // Plain text as requested
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
      isVerified: false // Not verified until OTP is confirmed
    });

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(phone, otp);
    
    // Send OTP via Fast2SMS
    try {
      const result = await sendOTP(phone, otp);
      console.log('OTP send result:', result);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError.message);
      
      // For development only - return OTP in response
      if (process.env.NODE_ENV === 'development') {
        return res.status(201).json({
          message: 'Registration successful. Use OTP for verification (DEV MODE)',
          userId: user._id,
          phone,
          devOTP: otp // Only for testing!
        });
      }
    }

    res.status(201).json({
      message: 'Registration successful. Please verify OTP.',
      userId: user._id,
      phone
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
const verifyOTPHandler = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const result = verifyOTP(phone, otp);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    // Update patient verification status
    const patient = await Patient.findOneAndUpdate(
      { phone },
      { isVerified: true },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ 
      success: true,
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login - UPDATED with better doctor handling
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    console.log('🔐 Login attempt:', { username, role });

    // Find user
    const user = await User.findOne({ 
      username: username,
      password: password,
      role: role 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    let doctorData = null;
    let patientData = null;

    // Role-specific data fetching
    if (role === 'patient') {
      patientData = await Patient.findOne({ userId: user._id });
      
      if (!patientData) {
        return res.status(401).json({ message: 'Patient profile not found' });
      }
      
      if (!patientData.isVerified) {
        return res.status(401).json({ message: 'Please verify your phone number first' });
      }
    }
    
    if (role === 'doctor') {
      // Find doctor by email (username is email for doctors)
      doctorData = await Doctor.findOne({ email: username });
      
      if (!doctorData) {
        return res.status(401).json({ message: 'Doctor profile not found' });
      }
      
      console.log('👨‍⚕️ Doctor found:', doctorData.name);
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');

    // Return response with appropriate data
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        ...(role === 'doctor' && { doctorId: doctorData?._id }), // Include doctorId for doctors
        ...(role === 'patient' && { patientId: patientData?._id }) // Include patientId for patients
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  res.json({ message: 'Logout successful' });
};

module.exports = {
  registerPatient,
  verifyOTPHandler,
  login,
  logout
};



// const User = require('../models/User');
// const Patient = require('../models/Patient');
// const Doctor = require('../models/Doctor');
// const { generateOTP, storeOTP, sendOTP, verifyOTP } = require('../utils/otpService');

// // Patient Registration with OTP
// const registerPatient = async (req, res) => {
//   try {
//     const { username, password, fullName, email, phone, age, gender, address } = req.body;

//     console.log('📝 Registration attempt for:', { username, email, phone });

//     // Clean phone number
//     const cleanPhone = phone.replace(/\D/g, '');
    
//     // Validate phone number
//     if (cleanPhone.length !== 10) {
//       return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
//     }

//     // Check if user exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Username already exists' });
//     }

//     // Check if phone already registered
//     const existingPatient = await Patient.findOne({ phone: cleanPhone });
//     if (existingPatient) {
//       return res.status(400).json({ message: 'Phone number already registered' });
//     }

//     // Check if email already registered
//     const existingEmail = await Patient.findOne({ email });
//     if (existingEmail) {
//       return res.status(400).json({ message: 'Email already registered' });
//     }

//     // Create user
//     const user = await User.create({
//       username,
//       password, // Plain text as requested
//       role: 'patient'
//     });

//     console.log('✅ User created:', user._id);

//     // Create patient profile
//     const patient = await Patient.create({
//       userId: user._id,
//       fullName,
//       email,
//       phone: cleanPhone,
//       age,
//       gender,
//       address,
//       isVerified: false // Not verified until OTP is confirmed
//     });

//     console.log('✅ Patient profile created:', patient._id);

//     // Generate and store OTP
//     const otp = generateOTP();
//     storeOTP(cleanPhone, otp);
    
//     // Send OTP via Fast2SMS
//     try {
//       console.log('📤 Attempting to send OTP via Fast2SMS...');
//       const result = await sendOTP(cleanPhone, otp);
//       console.log('📬 OTP send result:', result);
      
//       // In development mode, return OTP for testing
//       if (process.env.NODE_ENV === 'development' && result.devOTP) {
//         return res.status(201).json({
//           message: 'Registration successful. Please verify OTP.',
//           userId: user._id,
//           phone: cleanPhone,
//           devOTP: result.devOTP, // Only for testing!
//           note: 'This OTP is shown only in development mode'
//         });
//       }
      
//     } catch (smsError) {
//       console.error('❌ SMS sending failed:', smsError.message);
      
//       // In development, still proceed but warn user
//       if (process.env.NODE_ENV === 'development') {
//         console.log('⚠️ Continuing in development mode without SMS');
//         return res.status(201).json({
//           message: 'Registration successful. Please verify OTP (SMS failed - using console OTP)',
//           userId: user._id,
//           phone: cleanPhone,
//           devOTP: otp, // Show OTP in response for testing
//           note: 'SMS sending failed. Use this OTP for testing.'
//         });
//       }
      
//       return res.status(500).json({ 
//         message: 'Failed to send OTP. Please try again or contact support.' 
//       });
//     }

//     res.status(201).json({
//       message: 'Registration successful. Please verify OTP sent to your mobile.',
//       userId: user._id,
//       phone: cleanPhone
//     });

//   } catch (error) {
//     console.error('❌ Registration error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Verify OTP
// const verifyOTPHandler = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;

//     console.log('🔐 Verifying OTP for:', { phone, otp });

//     const result = verifyOTP(phone, otp);
    
//     if (!result.success) {
//       return res.status(400).json({ message: result.message });
//     }

//     // Update patient verification status
//     const cleanPhone = phone.replace(/\D/g, '');
//     const patient = await Patient.findOneAndUpdate(
//       { phone: cleanPhone },
//       { isVerified: true },
//       { new: true }
//     );

//     if (!patient) {
//       return res.status(404).json({ message: 'Patient not found' });
//     }

//     console.log('✅ Patient verified:', patient.fullName);

//     res.json({ 
//       success: true,
//       message: 'OTP verified successfully. You can now login.' 
//     });
//   } catch (error) {
//     console.error('❌ OTP verification error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Resend OTP
// const resendOTPHandler = async (req, res) => {
//   try {
//     const { phone } = req.body;
    
//     const cleanPhone = phone.replace(/\D/g, '');
    
//     // Check if patient exists
//     const patient = await Patient.findOne({ phone: cleanPhone });
//     if (!patient) {
//       return res.status(404).json({ message: 'Patient not found' });
//     }
    
//     // Generate and send new OTP
//     const otp = generateOTP();
//     storeOTP(cleanPhone, otp);
    
//     const result = await sendOTP(cleanPhone, otp);
    
//     res.json({
//       message: 'OTP resent successfully',
//       ...(process.env.NODE_ENV === 'development' && { devOTP: otp })
//     });
    
//   } catch (error) {
//     console.error('Error resending OTP:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Login
// const login = async (req, res) => {
//   try {
//     const { username, password, role } = req.body;

//     console.log('🔐 Login attempt:', { username, role });

//     // Find user
//     const user = await User.findOne({ 
//       username: username,
//       password: password,
//       role: role 
//     });

//     if (!user) {
//       return res.status(401).json({ message: 'Invalid username or password' });
//     }

//     let doctorData = null;
//     let patientData = null;

//     // Role-specific data fetching
//     if (role === 'patient') {
//       patientData = await Patient.findOne({ userId: user._id });
      
//       if (!patientData) {
//         return res.status(401).json({ message: 'Patient profile not found' });
//       }
      
//       if (!patientData.isVerified) {
//         return res.status(401).json({ message: 'Please verify your phone number first' });
//       }
//     }
    
//     if (role === 'doctor') {
//       // Find doctor by email (username is email for doctors)
//       doctorData = await Doctor.findOne({ email: username });
      
//       if (!doctorData) {
//         return res.status(401).json({ message: 'Doctor profile not found' });
//       }
      
//       console.log('👨‍⚕️ Doctor found:', doctorData.name);
//     }

//     // Generate simple token
//     const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');

//     res.json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         ...(role === 'doctor' && { doctorId: doctorData?._id }),
//         ...(role === 'patient' && { patientId: patientData?._id })
//       }
//     });
//   } catch (error) {
//     console.error('❌ Login error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Logout
// const logout = async (req, res) => {
//   res.json({ message: 'Logout successful' });
// };

// module.exports = {
//   registerPatient,
//   verifyOTPHandler,
//   resendOTPHandler,
//   login,
//   logout
// };