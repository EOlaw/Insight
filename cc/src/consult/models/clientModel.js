const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clientSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user model
  company: { type: String }, // Client's company name if applicable
  industry: { type: String }, // Client's industry sector
  billingAddress: { type: String }, // Address for billing purposes
  preferredServices: [{ type: String }], // Array of preferred service types
  consultationHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }], // References to past consultations
  feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }], // References to feedback provided
});

module.exports = mongoose.model('Client', clientSchema);