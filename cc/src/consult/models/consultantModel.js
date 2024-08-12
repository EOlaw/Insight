const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultantSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user model
  specializations: [{ type: String }], // Array of consultant's specializations
  yearsOfExperience: { type: Number }, // Years of professional experience
  availabilitySchedule: { type: Map, of: Boolean }, // Availability schedule (e.g., { "Monday": true, "Tuesday": false })
  ratings: [{ type: Number }], // Array of ratings received
  certifications: [{ type: String }], // Array of relevant certifications
  consultationHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }], // References to past consultations
});

const Consultant = mongoose.model('Consultant', consultantSchema);
module.exports = Consultant