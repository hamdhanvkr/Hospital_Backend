// const fast2sms = require('fast-two-sms');

// // Store OTP temporarily (in production, use Redis)
// const otpStore = new Map();

// /**
//  * Generate a 6-digit OTP
//  */
// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// /**
//  * Store OTP with phone number and expiry
//  */
// const storeOTP = (phone, otp) => {
//   // Clean phone number (remove any non-digits)
//   const cleanPhone = phone.replace(/\D/g, '');
  
//   otpStore.set(cleanPhone, {
//     otp,
//     expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
//     attempts: 0,
//     createdAt: new Date().toISOString()
//   });
  
//   console.log(`✅ OTP stored for ${cleanPhone}: ${otp} (expires in 10 minutes)`);
  
//   // Auto cleanup after 10 minutes
//   setTimeout(() => {
//     if (otpStore.has(cleanPhone)) {
//       otpStore.delete(cleanPhone);
//       console.log(`🗑️ OTP expired for ${cleanPhone}`);
//     }
//   }, 10 * 60 * 1000);
  
//   return cleanPhone;
// };

// /**
//  * Send OTP using Fast2SMS API - CORRECTED VERSION
//  */
// const sendOTP = async (phone, otp) => {
//   try {
//     const apiKey = process.env.FAST2SMS_API_KEY;
    
//     if (!apiKey) {
//       throw new Error('❌ FAST2SMS_API_KEY not found in environment variables');
//     }

//     // Clean phone number (remove +91 or any special characters)
//     const cleanPhone = phone.replace(/\D/g, '');
    
//     // Ensure it's a 10-digit Indian number
//     if (cleanPhone.length !== 10) {
//       throw new Error('❌ Invalid phone number. Must be 10 digits.');
//     }

//     console.log('📱 Sending OTP to:', cleanPhone);
//     console.log('🔑 OTP:', otp);

//     // OPTION 1: Use axios directly with the correct Quick SMS format
//     const axios = require('axios');
    
//     // According to Fast2SMS docs, Quick SMS route uses 'q' and costs ₹5 per SMS [citation:2][citation:3]
//     const params = new URLSearchParams();
//     params.append('authorization', apiKey);
//     params.append('message', `Your OTP for ABC Hospital is ${otp}. Valid for 10 minutes.`);
//     params.append('language', 'english');
//     params.append('route', 'q'); // 'q' for Quick SMS route (NO DLT REQUIRED!)
//     params.append('numbers', cleanPhone);

//     console.log('📤 Sending via Quick SMS route (q)...');
    
//     const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', params, {
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });

//     console.log('📥 Fast2SMS Response:', response.data);

//     // Check response
//     if (response.data && response.data.return === true) {
//       console.log('✅ OTP sent successfully via Quick SMS!');
//       return {
//         success: true,
//         message: 'OTP sent successfully',
//         requestId: response.data.request_id
//       };
//     } else {
//       // If Quick SMS fails, try the Bulk SMS (Service) route [citation:2]
//       console.log('⚠️ Trying Bulk SMS (Service) route...');
      
//       const serviceParams = new URLSearchParams();
//       serviceParams.append('authorization', apiKey);
//       serviceParams.append('message', `Your OTP for ABC Hospital is ${otp}. Valid for 10 minutes.`);
//       serviceParams.append('language', 'english');
//       serviceParams.append('route', 'd'); // 'd' for Bulk SMS (Service) route
//       serviceParams.append('numbers', cleanPhone);
      
//       const serviceResponse = await axios.post('https://www.fast2sms.com/dev/bulkV2', serviceParams, {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       });
      
//       if (serviceResponse.data && serviceResponse.data.return === true) {
//         return {
//           success: true,
//           message: 'OTP sent successfully via Bulk SMS route',
//           requestId: serviceResponse.data.request_id
//         };
//       } else {
//         throw new Error(serviceResponse.data.message || 'Failed to send OTP');
//       }
//     }
//   } catch (error) {
//     console.error('❌ Fast2SMS Error:', error.message);
//     if (error.response) {
//       console.error('Response data:', error.response.data);
//     }
    
//     // For development/testing - simulate success
//     if (process.env.NODE_ENV === 'development') {
//       console.log('⚠️ DEVELOPMENT MODE: Simulating OTP send success');
//       console.log(`📱 Test OTP for ${phone}: ${otp}`);
//       return {
//         success: true,
//         message: 'OTP sent successfully (DEVELOPMENT MODE)',
//         devOTP: otp,
//         phone: phone
//       };
//     }
    
//     throw error;
//   }
// };

// /**
//  * Verify OTP
//  */
// const verifyOTP = (phone, otp) => {
//   // Clean phone number
//   const cleanPhone = phone.replace(/\D/g, '');
  
//   const stored = otpStore.get(cleanPhone);
  
//   if (!stored) {
//     console.log(`❌ No OTP found for ${cleanPhone}`);
//     return { 
//       success: false, 
//       message: 'No OTP found for this number. Please request a new OTP.' 
//     };
//   }

//   console.log(`🔍 Verifying OTP for ${cleanPhone}:`, {
//     storedOTP: stored.otp,
//     receivedOTP: otp,
//     expiresAt: new Date(stored.expiresAt).toISOString(),
//     attempts: stored.attempts
//   });

//   if (Date.now() > stored.expiresAt) {
//     otpStore.delete(cleanPhone);
//     console.log(`⏰ OTP expired for ${cleanPhone}`);
//     return { 
//       success: false, 
//       message: 'OTP has expired. Please request a new OTP.' 
//     };
//   }

//   // Track attempts to prevent brute force
//   stored.attempts += 1;
//   if (stored.attempts > 3) {
//     otpStore.delete(cleanPhone);
//     console.log(`🚫 Too many failed attempts for ${cleanPhone}`);
//     return { 
//       success: false, 
//       message: 'Too many failed attempts. Please request a new OTP.' 
//     };
//   }

//   if (stored.otp === otp) {
//     otpStore.delete(cleanPhone);
//     console.log(`✅ OTP verified successfully for ${cleanPhone}`);
//     return { 
//       success: true, 
//       message: 'OTP verified successfully' 
//     };
//   }

//   console.log(`❌ Invalid OTP for ${cleanPhone}`);
//   return { 
//     success: false, 
//     message: 'Invalid OTP' 
//   };
// };

// /**
//  * Resend OTP
//  */
// const resendOTP = async (phone) => {
//   try {
//     const cleanPhone = phone.replace(/\D/g, '');
    
//     // Generate new OTP
//     const otp = generateOTP();
    
//     // Store new OTP
//     storeOTP(cleanPhone, otp);
    
//     // Send OTP
//     const result = await sendOTP(cleanPhone, otp);
    
//     return {
//       success: true,
//       message: 'OTP resent successfully',
//       ...result
//     };
//   } catch (error) {
//     console.error('Error resending OTP:', error);
//     throw error;
//   }
// };

// module.exports = {
//   generateOTP,
//   storeOTP,
//   sendOTP,
//   verifyOTP,
//   resendOTP
// };




const axios = require('axios');

// Store OTP temporarily (in production, use Redis)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP with phone number and expiry
 */
const storeOTP = (phone, otp) => {
  // Clean phone number (remove any non-digits)
  const cleanPhone = phone.replace(/\D/g, '');
  
  otpStore.set(cleanPhone, {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    attempts: 0,
    createdAt: new Date().toISOString()
  });
  
  console.log(`✅ OTP stored for ${cleanPhone}: ${otp} (expires in 10 minutes)`);
  
  // Auto cleanup after 10 minutes
  setTimeout(() => {
    if (otpStore.has(cleanPhone)) {
      otpStore.delete(cleanPhone);
      console.log(`🗑️ OTP expired for ${cleanPhone}`);
    }
  }, 10 * 60 * 1000);
  
  return cleanPhone;
};

/**
 * Send OTP using Fast2SMS API - CORRECTED VERSION
 */
// const sendOTP = async (phone, otp) => {
//   try {
//     const apiKey = process.env.FAST2SMS_API_KEY;
    
//     if (!apiKey) {
//       throw new Error('❌ FAST2SMS_API_KEY not found in environment variables');
//     }

//     // Clean phone number (remove +91 or any special characters)
//     const cleanPhone = phone.replace(/\D/g, '');
    
//     // Ensure it's a 10-digit Indian number
//     if (cleanPhone.length !== 10) {
//       throw new Error('❌ Invalid phone number. Must be 10 digits.');
//     }

//     console.log('📱 Sending OTP to:', cleanPhone);
//     console.log('🔑 OTP:', otp);

//     // CORRECT FAST2SMS API FORMAT - Using query parameters with GET
//     const url = 'https://www.fast2sms.com/dev/bulkV2';
//     const params = {
//       authorization: apiKey,
//       variables_values: otp,
//       route: 'otp',
//       numbers: cleanPhone
//     };

//     console.log('📤 Sending request to Fast2SMS...');

//     const response = await axios.get(url, { 
//       params,
//       headers: {
//         'Cache-Control': 'no-cache'
//       },
//       timeout: 10000
//     });

//     console.log('📥 Fast2SMS Response:', response.data);

//     // Check response
//     if (response.data && response.data.return === true) {
//       console.log('✅ OTP sent successfully!');
//       return {
//         success: true,
//         message: 'OTP sent successfully',
//         requestId: response.data.request_id
//       };
//     } else {
//       // If OTP route fails, try transactional route
//       console.log('⚠️ Trying transactional route...');
      
//       const txParams = {
//         authorization: apiKey,
//         message: `Your OTP for ABC Hospital is ${otp}. Valid for 10 minutes.`,
//         language: 'english',
//         route: 'q', // Quick transactional route
//         numbers: cleanPhone
//       };
      
//       const txResponse = await axios.get(url, { 
//         params: txParams,
//         headers: {
//           'Cache-Control': 'no-cache'
//         },
//         timeout: 10000
//       });
      
//       if (txResponse.data && txResponse.data.return === true) {
//         return {
//           success: true,
//           message: 'OTP sent successfully via transactional route',
//           requestId: txResponse.data.request_id
//         };
//       } else {
//         throw new Error(txResponse.data.message || 'Failed to send OTP');
//       }
//     }
//   } catch (error) {
//     console.error('❌ Fast2SMS Error:', error.message);
//     if (error.response) {
//       console.error('Response data:', error.response.data);
//     }
    
//     // For development/testing - simulate success
//     if (process.env.NODE_ENV === 'development') {
//       console.log('⚠️ DEVELOPMENT MODE: Simulating OTP send success');
//       console.log(`📱 Test OTP for ${phone}: ${otp}`);
//       return {
//         success: true,
//         message: 'OTP sent successfully (DEVELOPMENT MODE)',
//         devOTP: otp,
//         phone: phone
//       };
//     }
    
//     throw error;
//   }
// };


const sendOTP = async (phone, otp) => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (!apiKey) {
      throw new Error('❌ FAST2SMS_API_KEY not found in environment variables');
    }

    // Clean phone number (remove +91 or any special characters)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Ensure it's a 10-digit Indian number
    if (cleanPhone.length !== 10) {
      throw new Error('❌ Invalid phone number. Must be 10 digits.');
    }

    console.log('📱 Sending OTP to:', cleanPhone);
    console.log('🔑 OTP:', otp);

    // QUICK SMS ROUTE - NO KYC, NO DLT REQUIRED! [citation:6]
    // This route costs ₹5 per SMS and works immediately
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    const params = {
      authorization: apiKey,
      message: `Your OTP for ABC Hospital is ${otp}. Valid for 10 minutes.`,
      language: 'english',
      route: 'q', // 'q' for Quick SMS route [citation:6]
      numbers: cleanPhone
    };

    console.log('📤 Sending via Quick SMS route (No KYC required)...');

    const response = await axios.get(url, { 
      params,
      headers: {
        'Cache-Control': 'no-cache'
      },
      timeout: 10000
    });

    console.log('📥 Fast2SMS Response:', response.data);

    // Check response
    if (response.data && response.data.return === true) {
      console.log('✅ OTP sent successfully via Quick SMS!');
      return {
        success: true,
        message: 'OTP sent successfully',
        requestId: response.data.request_id
      };
    } else {
      throw new Error(response.data.message || 'Failed to send OTP');
    }
  } catch (error) {
    console.error('❌ Fast2SMS Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    // For development/testing - simulate success
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ DEVELOPMENT MODE: Simulating OTP send success');
      console.log(`📱 Test OTP for ${phone}: ${otp}`);
      return {
        success: true,
        message: 'OTP sent successfully (DEVELOPMENT MODE)',
        devOTP: otp,
        phone: phone
      };
    }
    
    throw error;
  }
};


/**
 * Verify OTP
 */
const verifyOTP = (phone, otp) => {
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  
  const stored = otpStore.get(cleanPhone);
  
  if (!stored) {
    console.log(`❌ No OTP found for ${cleanPhone}`);
    return { 
      success: false, 
      message: 'No OTP found for this number. Please request a new OTP.' 
    };
  }

  console.log(`🔍 Verifying OTP for ${cleanPhone}:`, {
    storedOTP: stored.otp,
    receivedOTP: otp,
    expiresAt: new Date(stored.expiresAt).toISOString(),
    attempts: stored.attempts
  });

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(cleanPhone);
    console.log(`⏰ OTP expired for ${cleanPhone}`);
    return { 
      success: false, 
      message: 'OTP has expired. Please request a new OTP.' 
    };
  }

  // Track attempts to prevent brute force
  stored.attempts += 1;
  if (stored.attempts > 3) {
    otpStore.delete(cleanPhone);
    console.log(`🚫 Too many failed attempts for ${cleanPhone}`);
    return { 
      success: false, 
      message: 'Too many failed attempts. Please request a new OTP.' 
    };
  }

  if (stored.otp === otp) {
    otpStore.delete(cleanPhone);
    console.log(`✅ OTP verified successfully for ${cleanPhone}`);
    return { 
      success: true, 
      message: 'OTP verified successfully' 
    };
  }

  console.log(`❌ Invalid OTP for ${cleanPhone}`);
  return { 
    success: false, 
    message: 'Invalid OTP' 
  };
};

/**
 * Resend OTP
 */
const resendOTP = async (phone) => {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Store new OTP
    storeOTP(cleanPhone, otp);
    
    // Send OTP
    const result = await sendOTP(cleanPhone, otp);
    
    return {
      success: true,
      message: 'OTP resent successfully',
      ...result
    };
  } catch (error) {
    console.error('Error resending OTP:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  storeOTP,
  sendOTP,
  verifyOTP,
  resendOTP
};