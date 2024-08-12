const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const consultationSchema = new Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }, // Reference to the client
  consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true }, // Reference to the consultant
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // Reference to the service provided
  dateTime: { type: Date, required: true }, // Date and time of the consultation
  duration: { type: Number, required: true }, // Duration in minutes
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }, // Status of the consultation
  notes: { type: String }, // Notes about the consultation
  followUpActions: [{ type: String }], // Array of follow-up actions
  recordingUrl: { type: String }, // URL to consultation recording if applicable
});

const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation