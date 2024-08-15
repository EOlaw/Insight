// In a new file, e.g., middlewares/consultantMiddleware.js

const Consultant = require('../models/consultantModel');

const checkConsultantVerification = async (req, res, next) => {
  try {
    const consultant = await Consultant.findOne({ user: req.user._id });
    if (!consultant) {
      return res.status(403).json({ message: 'Consultant profile not found' });
    }
    if (!consultant.isEmployeeIdVerified) {
      return res.status(403).json({ message: 'Consultant is not verified. Please contact an administrator.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking consultant verification', error: error.message });
  }
};

module.exports = { checkConsultantVerification };