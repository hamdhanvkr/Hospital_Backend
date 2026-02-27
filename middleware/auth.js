const User = require('../models/User');
const Doctor = require('../models/Doctor');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Decode token (simple base64 decode)
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [userId] = decoded.split(':');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.userId = userId;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

const authorizePatient = (req, res, next) => {
  if (req.userRole !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Patient only.' });
  }
  next();
};

const authorizeDoctor = async (req, res, next) => {
  if (req.userRole !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Doctor only.' });
  }

  try {
    // Get doctor ID from user ID
    const user = await User.findById(req.userId);
    const doctor = await Doctor.findOne({ email: user.username }); // Doctors use email as username
    
    if (!doctor) {
      console.log('Doctor not found for user:', req.userId);
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    req.doctorId = doctor._id;
    console.log('✅ Doctor authorized. Doctor ID:', req.doctorId);
    next();
  } catch (error) {
    console.error('Error in authorizeDoctor:', error);
    res.status(500).json({ message: 'Error authorizing doctor' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = {
  authenticate,
  authorizePatient,
  authorizeDoctor,
  authorizeAdmin
};