const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clientSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String },
  bio: { type: String, maxLength: 500 },
  industry: { type: String },
  billingAddress: { type: String },
  preferredServices: [{ type: String }],
  consultationHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }],
  feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }],
  // New fields
  clientSince: { type: Date, default: Date.now },
  primaryContact: { type: String },
  companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '500+'] },
  annualRevenue: { type: String },
  preferredCommunicationMethod: { type: String, enum: ['Email', 'Phone', 'Video Call', 'In-Person'] },
  notes: { type: String },
  tags: [{ type: String }]
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;