require('dotenv').config();
const { sendOTP } = require('./utils/otpService');

async function test() {
  try {
    const phone = '9629601141'; // Your test number
    const otp = '123456';
    
    console.log('🚀 Testing OTP send...');
    const result = await sendOTP(phone, otp);
    console.log('✅ Result:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();