const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { generateOTP, storeOTP, sendOTP, verifyOTP, resendOTP } = require('../utils/otpService');

// Temporary storage for registration data (NOT in database)
const tempRegistrationStore = new Map();

/**
 * Store temporary registration data
 */
const storeTempRegistration = (phone, userData) => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  tempRegistrationStore.set(cleanPhone, {
    ...userData,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
  });
  
  console.log(`📝 Temporary registration data stored for ${cleanPhone}`);
  
  // Auto cleanup after 10 minutes
  setTimeout(() => {
    if (tempRegistrationStore.has(cleanPhone)) {
      tempRegistrationStore.delete(cleanPhone);
      console.log(`🗑️ Temporary registration data expired for ${cleanPhone}`);
    }
  }, 10 * 60 * 1000);
  
  return cleanPhone;
};

/**
 * Get temporary registration data
 */
const getTempRegistration = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return tempRegistrationStore.get(cleanPhone);
};

/**
 * Delete temporary registration data
 */
const deleteTempRegistration = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  tempRegistrationStore.delete(cleanPhone);
  console.log(`🗑️ Temporary registration data deleted for ${cleanPhone}`);
};

// STEP 1: Send OTP - NO DATABASE ENTRY YET
const sendOTPForRegistration = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, age, gender, address } = req.body;

    console.log('📝 Registration OTP request for:', { username, email, phone });

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validate phone number
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    }

    // Check if username already exists in database
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if phone already registered in database
    const existingPatient = await Patient.findOne({ phone: cleanPhone });
    if (existingPatient) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Check if email already registered in database
    const existingEmail = await Patient.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Store registration data temporarily (NOT in database yet)
    const userData = {
      username,
      password,
      fullName,
      email,
      phone: cleanPhone,
      age,
      gender,
      address
    };
    
    storeTempRegistration(cleanPhone, userData);

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(cleanPhone, otp);
    
    // Send OTP via Fast2SMS
    try {
      const result = await sendOTP(cleanPhone, otp);
      console.log('OTP send result:', result);
      
      // In development mode, return OTP for testing
      if (process.env.NODE_ENV === 'development' && result.devOTP) {
        return res.status(200).json({
          message: 'OTP sent successfully. Please verify.',
          phone: cleanPhone,
          devOTP: result.devOTP,
          note: 'This OTP is shown only in development mode'
        });
      }
      
      res.status(200).json({
        message: 'OTP sent successfully. Please verify.',
        phone: cleanPhone
      });

    } catch (smsError) {
      console.error('SMS sending failed:', smsError.message);
      
      // Clean up temp data if SMS fails
      deleteTempRegistration(cleanPhone);
      
      // For development only - still allow testing
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          message: 'OTP generated (SMS failed - using console OTP)',
          phone: cleanPhone,
          devOTP: otp,
          note: 'SMS sending failed. Use this OTP for testing.'
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to send OTP. Please try again.' 
      });
    }

  } catch (error) {
    console.error('Registration OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// STEP 2: Verify OTP and CREATE USER - ONLY AFTER OTP VERIFICATION
const verifyOTPAndCreateUser = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    console.log('🔐 Verifying OTP for:', { phone });

    // Verify OTP
    const verificationResult = verifyOTP(phone, otp);
    
    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.message });
    }

    // Get temporary registration data
    const cleanPhone = phone.replace(/\D/g, '');
    const userData = getTempRegistration(cleanPhone);

    if (!userData) {
      return res.status(400).json({ 
        message: 'Registration data expired. Please register again.' 
      });
    }

    // Double-check if user wasn't created in the meantime
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      deleteTempRegistration(cleanPhone);
      return res.status(400).json({ message: 'Username already taken' });
    }

    // ✅ NOW create user in database (ONLY AFTER OTP VERIFICATION)
    const user = await User.create({
      username: userData.username,
      password: userData.password,
      role: 'patient'
    });

    // Create patient profile
    const patient = await Patient.create({
      userId: user._id,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      age: userData.age,
      gender: userData.gender,
      address: userData.address,
      isVerified: true // Mark as verified since OTP is confirmed
    });

    // Clean up temporary data
    deleteTempRegistration(cleanPhone);

    console.log('✅ Patient registered successfully:', patient.fullName);

    res.status(201).json({ 
      success: true,
      message: 'Registration successful! You can now login.',
      userId: user._id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP
const resendOTPHandler = async (req, res) => {
  try {
    const { phone } = req.body;
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if temp registration exists
    const userData = getTempRegistration(cleanPhone);
    if (!userData) {
      return res.status(400).json({ 
        message: 'Registration session expired. Please register again.' 
      });
    }
    
    // Resend OTP using the utility function
    const result = await resendOTP(cleanPhone);
    
    res.json({
      message: 'OTP resent successfully',
      ...(process.env.NODE_ENV === 'development' && { devOTP: result.devOTP })
    });
    
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login
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

    // Generate simple token
    const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        ...(role === 'doctor' && { doctorId: doctorData?._id }),
        ...(role === 'patient' && { patientId: patientData?._id })
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
};


// Verify user by email and phone
const verifyUser = async (req, res) => {
  try {
    const { email, phone, role } = req.body;
    
    console.log('🔍 Verifying user:', { email, phone, role });
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    let user = null;
    
    // Case-insensitive email search
    const emailRegex = new RegExp(`^${email}$`, 'i');
    
    if (role === 'patient') {
      user = await Patient.findOne({ 
        email: emailRegex, 
        phone: cleanPhone 
      });
    } 
    else if (role === 'doctor') {
      user = await Doctor.findOne({ 
        email: emailRegex, 
        phone: cleanPhone 
      });
    } 
    else if (role === 'admin') {
      // If you don't have Admin model, just return success for admin
      // or handle admin verification differently
      return res.json({ 
        success: true, 
        message: 'Admin verified',
        userId: null,
        userDetails: { email, phone }
      });
    }
    
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Email and phone number do not match our records' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'User verified',
      userId: user._id,
      userDetails: {
        name: user.fullName || user.name,
        email: user.email,
        phone: user.phone
      }
    });
    
  } catch (error) {
    console.error('❌ Verify user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Change password - FIXED VERSION (remove Admin references)
const changePassword = async (req, res) => {
  try {
    const { email, phone, newPassword, role } = req.body;
    
    console.log('🔑 Changing password for:', { email, phone, role });
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Find the user account
    let userAccount = null;
    
    if (role === 'patient') {
      const patient = await Patient.findOne({ email, phone: cleanPhone });
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      userAccount = await User.findById(patient.userId);
    } 
    else if (role === 'doctor') {
      const doctor = await Doctor.findOne({ email, phone: cleanPhone });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      userAccount = await User.findOne({ username: email, role: 'doctor' });
    } 
    else if (role === 'admin') {
      // Handle admin password change - you might have a different logic
      userAccount = await User.findOne({ username: email, role: 'admin' });
    }
    
    if (!userAccount) {
      return res.status(404).json({ message: 'User account not found' });
    }
    
    // Update password
    userAccount.password = newPassword;
    await userAccount.save();
    
    console.log('✅ Password changed successfully for:', email);
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Logout
const logout = async (req, res) => {
  res.json({ message: 'Logout successful' });
};

module.exports = {
  sendOTPForRegistration,  // Changed from registerPatient
  verifyOTPAndCreateUser,   // Changed from verifyOTPHandler
  resendOTPHandler,
  login,
  verifyUser,
  changePassword,
  logout
};











// const User = require('../models/User');
// const Patient = require('../models/Patient');
// const Doctor = require('../models/Doctor'); // ADD THIS IMPORT
// const { generateOTP, storeOTP, sendOTP, verifyOTP } = require('../utils/otpService');

// // Patient Registration with OTP
// const registerPatient = async (req, res) => {
//   try {
//     const { username, password, fullName, email, phone, age, gender, address } = req.body;

//     // Check if user exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Username already exists' });
//     }

//     // Check if phone already registered
//     const existingPatient = await Patient.findOne({ phone });
//     if (existingPatient) {
//       return res.status(400).json({ message: 'Phone number already registered' });
//     }

//     // Create user
//     const user = await User.create({
//       username,
//       password, // Plain text as requested
//       role: 'patient'
//     });

//     // Create patient profile
//     const patient = await Patient.create({
//       userId: user._id,
//       fullName,
//       email,
//       phone,
//       age,
//       gender,
//       address,
//       isVerified: false // Not verified until OTP is confirmed
//     });

//     // Generate and store OTP
//     const otp = generateOTP();
//     storeOTP(phone, otp);
    
//     // Send OTP via Fast2SMS
//     try {
//       const result = await sendOTP(phone, otp);
//       console.log('OTP send result:', result);
//     } catch (smsError) {
//       console.error('SMS sending failed:', smsError.message);
      
//       // For development only - return OTP in response
//       if (process.env.NODE_ENV === 'development') {
//         return res.status(201).json({
//           message: 'Registration successful. Use OTP for verification (DEV MODE)',
//           userId: user._id,
//           phone,
//           devOTP: otp // Only for testing!
//         });
//       }
//     }

//     res.status(201).json({
//       message: 'Registration successful. Please verify OTP.',
//       userId: user._id,
//       phone
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Verify OTP
// const verifyOTPHandler = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;

//     const result = verifyOTP(phone, otp);
    
//     if (!result.success) {
//       return res.status(400).json({ message: result.message });
//     }

//     // Update patient verification status
//     const patient = await Patient.findOneAndUpdate(
//       { phone },
//       { isVerified: true },
//       { new: true }
//     );

//     if (!patient) {
//       return res.status(404).json({ message: 'Patient not found' });
//     }

//     res.json({ 
//       success: true,
//       message: 'OTP verified successfully' 
//     });
//   } catch (error) {
//     console.error('OTP verification error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Login - UPDATED with better doctor handling
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

//     // Generate simple token (in production, use JWT)
//     const token = Buffer.from(`${user._id}:${Date.now()}`).toString('base64');

//     // Return response with appropriate data
//     res.json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         ...(role === 'doctor' && { doctorId: doctorData?._id }), // Include doctorId for doctors
//         ...(role === 'patient' && { patientId: patientData?._id }) // Include patientId for patients
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
//   login,
//   logout
// };



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