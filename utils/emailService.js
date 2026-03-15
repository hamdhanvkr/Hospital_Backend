const nodemailer = require('nodemailer');

// Create transporter with more detailed config
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Show debug output
  logger: true // Log information
});

/**
 * Send email notification for rescheduled appointment
 */
const sendRescheduleEmail = async (patientEmail, patientName, doctorName, appointmentDetails) => {
  try {
    const { originalDate, originalTime, newDate, newTime, reason } = appointmentDetails;

    console.log('📧 Preparing to send reschedule email to:', patientEmail);
    console.log('📧 Using account:', process.env.EMAIL_USER);

    const mailOptions = {
      from: `"ABC Hospital" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: '📅 Your Appointment Has Been Rescheduled - ABC Hospital',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ABC Hospital</h1>
            <p style="color: #e0e0e0; margin: 5px 0 0;">Your Health, Our Priority</p>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Appointment Rescheduled</h2>
            
            <p style="color: #555; font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
            
            <p style="color: #555; font-size: 16px;">Your appointment with <strong>Dr. ${doctorName}</strong> has been rescheduled.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #856404; margin: 0; font-weight: bold;">Reason for Rescheduling:</p>
              <p style="color: #856404; margin: 5px 0 0;">${reason}</p>
            </div>
            
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Appointment Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold; width: 40%;">Original Date</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">${originalDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold;">Original Time</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">${originalTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #4CAF50; color: white; font-weight: bold;">New Date</td>
                  <td style="padding: 8px; background-color: #C8E6C9;">${newDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #4CAF50; color: white; font-weight: bold;">New Time</td>
                  <td style="padding: 8px; background-color: #C8E6C9;">${newTime}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #004085; margin: 0; font-size: 14px;">
                <strong>📌 Important Notes:</strong>
              </p>
              <ul style="color: #004085; margin: 10px 0 0; padding-left: 20px; font-size: 14px;">
                <li>Please arrive 10 minutes before your scheduled time</li>
                <li>Bring your previous medical reports if any</li>
                <li>For any queries, contact us at ${process.env.EMAIL_USER}</li>
              </ul>
            </div>
            
            <p style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
              This is an automated message from ABC Hospital. Please do not reply to this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ABC Hospital. All rights reserved.<br>
              For assistance, call us at: +91 9876543210
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Reschedule email sent to:', patientEmail);
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending reschedule email:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error command:', error.command);
    throw error;
  }
};

/**
 * Send email notification for confirmed appointment
 */
const sendConfirmationEmail = async (patientEmail, patientName, doctorName, appointmentDetails) => {
  try {
    const { date, time, symptoms } = appointmentDetails;

    console.log('📧 Preparing to send confirmation email to:', patientEmail);

    const mailOptions = {
      from: `"ABC Hospital" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: '✅ Your Appointment Has Been Confirmed - ABC Hospital',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ABC Hospital</h1>
            <p style="color: #e0e0e0; margin: 5px 0 0;">Your Health, Our Priority</p>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Appointment Confirmed ✓</h2>
            
            <p style="color: #555; font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
            
            <p style="color: #555; font-size: 16px;">Your appointment with <strong>Dr. ${doctorName}</strong> has been <span style="color: #4CAF50; font-weight: bold;">CONFIRMED</span>.</p>
            
            <div style="background-color: #e8f5e8; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #2e7d32; margin: 0; font-weight: bold;">✓ Appointment Details</p>
            </div>
            
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Appointment Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold; width: 40%;">Doctor</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">Dr. ${doctorName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold;">Date</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">${date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold;">Time</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">${time}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; background-color: #e0e0e0; font-weight: bold;">Symptoms</td>
                  <td style="padding: 8px; background-color: #f5f5f5;">${symptoms || 'Not specified'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #004085; margin: 0; font-size: 14px;">
                <strong>📌 Important Instructions:</strong>
              </p>
              <ul style="color: #004085; margin: 10px 0 0; padding-left: 20px; font-size: 14px;">
                <li>Please arrive 10-15 minutes before your scheduled time</li>
                <li>Bring your previous medical reports and prescriptions</li>
                <li>Carry a valid ID proof for verification</li>
                <li>If you need to cancel or reschedule, please do so at least 2 days in advance</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>📞 Need Help?</strong><br>
                Contact us at ${process.env.EMAIL_USER} or call +91 9876543210
              </p>
            </div>
            
            <p style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
              Thank you for choosing ABC Hospital. We look forward to seeing you.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} ABC Hospital. All rights reserved.<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent to:', patientEmail);
    console.log('📧 Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error);
    throw error;
  }
};

module.exports = { sendRescheduleEmail, sendConfirmationEmail };