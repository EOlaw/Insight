const Consultant = require('../models/consultantModel');

const adminController = {
    verifyConsultant: async (req, res) => {
        try {
            const { consultantId, employeeId } = req.body;
            
            const consultant = await Consultant.findById(consultantId);
            if (!consultant) {
              return res.status(404).json({ message: 'Consultant not found' });
            }
        
            consultant.employeeId = employeeId;
            consultant.isEmployeeIdVerified = true;
            await consultant.save();
        
            res.status(200).json({ message: 'Consultant verified successfully', consultant });
          } catch (error) {
            res.status(500).json({ message: 'Error verifying consultant', error: error.message });
        }
    }
};

module.exports = adminController