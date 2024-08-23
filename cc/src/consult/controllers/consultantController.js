const Consultant = require('../../consult/models/consultantModel');
const Consultation = require('../../consult/models/consultationModel');
const Service = require('../../consult/models/serviceModel');
const User = require('../../auth/models/userModel');
const multer = require('multer');

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const consultantController = {
    // Get Consultant Profile
    getConsultantProfile: async (req, res) => {
        try {
            const consultant = await Consultant.findOne({ user: req.user._id })
                .populate('user', '-password')
                .populate({
                    path: 'consultationHistory',
                    populate: {
                        path: 'client',
                        select: 'firstName lastName',
                        populate: {
                            path: 'user', // This ensures that you can access user fields like firstName and lastName
                            select: 'firstName lastName'
                        }
                    }
                });
    
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant profile not found' });
            }
    
            res.status(200).render('consultants/profile', { consultant });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultant profile', error: err.message });
        }
    },
    
    // Edit Form
    renderEditProfile: async (req, res) => {
        try {
            const consultant = await Consultant.findOne({ user: req.user._id }).populate('user')
            if (!consultant) return res.status(404).json({ error: 'Client profile not found' });
            res.status(200).render('consultants/edit', { consultant })
        } catch {
            res.status(500).json({ error: err.message })
        }
    },

    // Update Consultant Profile
    updateConsultantProfile: [
    upload.single('avatar'),
        async (req, res) => {
            try {
                const { 
                    firstName, lastName, email, phoneNumber,
                    specializations, yearsOfExperience, certifications,
                    department, position, employeeId, hireDate
                } = req.body;
                
                // Validate input
                if (specializations) {
                    const specializationsArray = specializations.split(',').map(s => s.trim());
                    if (specializationsArray.length === 0) {
                        return res.status(400).json({ message: 'Specializations must be a non-empty array' });
                    }
                }
                if (yearsOfExperience && (isNaN(yearsOfExperience) || Number(yearsOfExperience) < 0)) {
                    return res.status(400).json({ message: 'Years of experience must be a non-negative number' });
                }

                let userUpdateData = { firstName, lastName, email, phoneNumber };
                let consultantUpdateData = { 
                    specializations: specializations ? specializations.split(',').map(s => s.trim()) : undefined,
                    yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
                    department,
                    position,
                    employeeId,
                    hireDate: hireDate ? new Date(hireDate) : undefined
                };

                // Handle certifications
                if (certifications) {
                    consultantUpdateData.certifications = certifications.split('\n').map(cert => {
                        const [name, issuer] = cert.split('-').map(s => s.trim());
                        return { name, issuer };
                    });
                }

                // Handle file upload
                if (req.file) {
                    userUpdateData['profile.avatar'] = {
                        data: req.file.buffer.toString('base64'),
                        contentType: req.file.mimetype
                    };
                }

                // Update User model
                const updatedUser = await User.findByIdAndUpdate(
                    req.user._id,
                    { $set: userUpdateData },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Update Consultant model
                const updatedConsultant = await Consultant.findOneAndUpdate(
                    { user: req.user._id },
                    { $set: consultantUpdateData },
                    { new: true, runValidators: true }
                ).populate('user', '-password');

                if (!updatedConsultant) {
                    return res.status(404).json({ message: 'Consultant profile not found' });
                }

                res.status(200).redirect('/consultant/');
            } catch (err) {
                res.status(500).json({ message: 'Error updating consultant profile', error: err.message });
            }
        }
    ],

    getConsultantsByService: async (req, res) => {
        try {
            const { serviceId } = req.params;
            const consultants = await Consultant.find({ specializations: serviceId })
                .populate('user', 'firstName lastName');
            
            res.json(consultants.map(consultant => ({
                _id: consultant._id,
                firstName: consultant.user.firstName,
                lastName: consultant.user.lastName
            })));
        } catch (err) {
            console.error('Error fetching consultants by service:', err);
            res.status(500).json({ message: 'Error fetching consultants', error: err.message });
        }
    },

    pickConsultation: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const consultantId = req.user._id;
    
            // Find the consultation and ensure it's available
            const consultation = await Consultation.findById(consultationId);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }
    
            if (consultation.consultant) {
                return res.status(400).json({ message: 'This consultation has already been assigned to a consultant' });
            }
    
            // Check if the consultant is qualified for this consultation
            const consultant = await Consultant.findOne({ user: consultantId });
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant profile not found' });
            }
    
            // You might want to add more checks here, e.g., 
            // - Does the consultant have the required specializations?
            // - Is the consultant available at the consultation time?
    
            // Assign the consultant to the consultation
            consultation.consultant = consultantId;
            consultation.status = 'assigned'; // You might want to update the status
    
            await consultation.save();
    
            // You might also want to update the consultant's schedule here
    
            res.status(200).json({ 
                message: 'Consultation successfully picked', 
                consultation: consultation 
            });
    
        } catch (err) {
            res.status(500).json({ message: 'Error picking consultation', error: err.message });
        }
    },
    
    // Also, let's add a function to view available consultations
    
    getConsultationsView: async (req, res) => {
        try {
            const availableConsultations = await Consultation.find({ 
                consultant: null, 
                dateTime: { $gt: new Date() }
            }).populate('client', 'username').populate('service', 'name');
    
            const pickedConsultations = await Consultation.find({
                consultant: req.user._id,
                dateTime: { $gt: new Date() }
            }).populate('client', 'username').populate('service', 'name');
    
            res.render('consultants/consultations', { 
                consultations: availableConsultations,
                pickedConsultations: pickedConsultations
            });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
        }
    },

    // Get Consultant's Consultations
    getConsultantConsultations: async (req, res) => {
        try {
            const consultations = await Consultation.find({ consultant: req.user._id })
                .populate('client', 'username')
                .populate('service', 'name')
                .sort({ dateTime: -1 });  // Sort by date, most recent first

            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
        }
    },

    // Get Consultant's Availability
    getConsultantAvailability: async (req, res) => {
        try {
            const consultant = await Consultant.findOne({ user: req.user._id });
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }
            res.status(200).json({ availability: consultant.availabilitySchedule });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching availability', error: err.message });
        }
    },

    // Update Consultant's Availability
    updateConsultantAvailability: async (req, res) => {
        try {
            const { availabilitySchedule } = req.body;
            
            // Validate input
            if (!availabilitySchedule || typeof availabilitySchedule !== 'object') {
                return res.status(400).json({ message: 'Invalid availability schedule format' });
            }

            const updatedConsultant = await Consultant.findOneAndUpdate(
                { user: req.user._id },
                { $set: { availabilitySchedule } },
                { new: true, runValidators: true }
            );

            if (!updatedConsultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            res.status(200).json({ message: 'Availability updated successfully', availability: updatedConsultant.availabilitySchedule });
        } catch (err) {
            res.status(500).json({ message: 'Error updating availability', error: err.message });
        }
    },

    // New method to get all unique specializations
    getAllSpecializations: async (req, res) => {
        try {
            const specializations = await Consultant.distinct('specializations');
            res.status(200).json(specializations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching specializations', error: err.message });
        }
    },

    // Update the existing method to get consultants by specialization
    getConsultantsByServiceAndSpecialization: async (req, res) => {
        try {
          const { serviceId, specialization } = req.params;
    
          // Verify that the service has this specialization
          const service = await Service.findById(serviceId);
          if (!service || !service.specializations.includes(specialization)) {
            return res.status(400).json({ message: 'Invalid service-specialization combination' });
          }
    
          const consultants = await Consultant.find({ specializations: specialization })
            .populate('user', 'firstName lastName');
          
          const formattedConsultants = consultants.map(consultant => ({
            _id: consultant._id,
            firstName: consultant.user.firstName,
            lastName: consultant.user.lastName
          }));
    
          res.status(200).json(formattedConsultants);
        } catch (err) {
          res.status(500).json({ message: 'Error fetching consultants', error: err.message });
        }
    },
};

module.exports = consultantController;