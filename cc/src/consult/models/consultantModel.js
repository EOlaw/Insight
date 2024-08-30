const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultantSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  specializations: [{ type: String }],
  yearsOfExperience: { type: Number },
  availabilitySchedule: { type: Map, of: Boolean },
  ratings: [{ type: Number }],
  certifications: [{ name: String, issuer: String, dateObtained: Date, expiryDate: Date, credentialID: String }],
  education: [{ institution: String, degree: String, fieldOfStudy: String, from: Date, to: Date, current: Boolean, description: String }],
  consultationHistory: [{ type: Schema.Types.ObjectId, ref: 'Consultation' }],
  
  consultantSince: { type: Date, default: Date.now },
  department: { type: String },
  position: { type: String },
  employeeId: { 
    type: String, 
    unique: true,
    immutable: true, // This makes the field unchangeable after it's set
    default: function() {
      return 'CONS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  isEmployeeIdVerified: { 
    type: Boolean, 
    default: false
  },
  hireDate: { type: Date, default: Date.now },
  
}, { timestamps: true });

// Middleware to prevent changes to employeeId
consultantSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified('employeeId')) {
    const error = new Error('employeeId cannot be modified');
    return next(error);
  }
  next();
});

// Static method to verify or unverify employeeId (to be used by admin)
consultantSchema.statics.setEmployeeIdVerification = async function(consultantId, isVerified, adminUser) {
  if (!adminUser.isAdmin) {
    throw new Error('Only administrators can modify employee ID verification status');
  }
  
  const consultant = await this.findById(consultantId);
  if (!consultant) {
    throw new Error('Consultant not found');
  }
  
  consultant.isEmployeeIdVerified = isVerified;
  await consultant.save();
  
  return consultant;
};

const Consultant = mongoose.model('Consultant', consultantSchema);
module.exports = Consultant;