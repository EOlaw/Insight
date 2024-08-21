const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statusHistorySchema = new Schema({
  status: { 
    type: String, 
    enum: ['pending_payment', 'scheduled', 'completed', 'cancelled'], 
    required: true 
  },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: false });

const consultationSchema = new Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  dateTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // Duration in minutes
  price: { 
        type: Number, 
        required: true,
        min: 0,
        set: v => Math.round(v * 100) / 100 // Rounds to 2 decimal places
  }, // Price in the smallest currency unit (e.g., cents)
  status: { 
    type: String, 
    enum: ['pending_payment', 'scheduled', 'completed', 'cancelled'], 
    default: 'pending_payment' 
  },
  statusHistory: [statusHistorySchema],
  paymentIntentId: { type: String }, // Stripe Payment Intent ID
  selectedOptions: [{ type: String }], // Array of selected additional options
  notes: { type: String },
  followUpActions: [{ type: String }],
  recordingUrl: { type: String },
  isLastMinute: { type: Boolean, default: false }, // Flag for last-minute bookings
}, { timestamps: true });

// Index for efficient querying
consultationSchema.index({ client: 1, dateTime: -1 });
consultationSchema.index({ consultant: 1, dateTime: -1 });
consultationSchema.index({ status: 1 });

const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;