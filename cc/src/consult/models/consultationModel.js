const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Assuming User model exists
    consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true }, // E.g., "10:00 AM - 11:00 AM"
    status: { type: String, enum: ['Pending', 'Accepted', 'Cancelled', 'Completed'], default: 'Pending' },
    notes: { type: String }
}, { timestamps: true });

const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;
