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

const noteSchema = new Schema({
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, enum: ['client', 'consultant'], required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const consultationSchema = new Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    dateTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // Duration in minutes
    price: {
        type: Number,
        required: true,
        min: 0
    },
    finalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'USD'
    },
    appliedPriceFactors: [{
        name: String,
        factor: Number
    }],
    status: {
        type: String,
        enum: ['pending_payment', 'scheduled', 'completed', 'cancelled'],
        default: 'pending_payment'
    },
    statusHistory: [statusHistorySchema],
    paymentIntentId: { type: String },
    selectedOptions: [{ type: String }],
    notes: [noteSchema],
    followUpActions: [{ type: String }],
    recordingUrl: { type: String },
    isLastMinute: { type: Boolean, default: false },
    specialization: { type: String, required: true },
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String }
    }
}, { timestamps: true });

// Index for efficient querying
consultationSchema.index({ client: 1, dateTime: -1 });
consultationSchema.index({ consultant: 1, dateTime: -1 });
consultationSchema.index({ status: 1 });

const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;