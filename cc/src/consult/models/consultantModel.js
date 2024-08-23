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
    default: function() {
      return 'CONS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  isEmployeeIdVerified: { type: Boolean, default: false },
  hireDate: { type: Date, default: Date.now },
  
}, { timestamps: true });

const Consultant = mongoose.model('Consultant', consultantSchema);
module.exports = Consultant;