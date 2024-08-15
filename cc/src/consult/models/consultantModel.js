const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultantSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  specializations: [{ type: String }], // Array of consultant's specializations
  yearsOfExperience: { type: Number },
  availabilitySchedule: { type: Map, of: Boolean }, // Availability schedule
  ratings: [{ type: Number }], // Array of ratings received
  certifications: [{ name: String, issuer: String, dateObtained: Date, expiryDate: Date, credentialID: String }], // Array of relevant certifications
  education: [{ institution: String, degree: String, fieldOfStudy: String, from: Date, to: Date, current: Boolean, description: String }],
  consultationHistory: [{ type: Schema.Types.ObjectId, ref: 'Consultation' }],
  
  // Staff-related fields
  consultantSince: { type: Date, default: Date.now },
  department: { type: String },
  position: { type: String },
  employeeId: { type: String, unique: true },
  isEmployeeIdVerified: { type: Boolean, default: false }, // New field
  hireDate: { type: Date, default: Date.now },
  
  // You can add more fields that are relevant to both consultants and staff here
}, { timestamps: true });

const Consultant = mongoose.model('Consultant', consultantSchema);
module.exports = Consultant;