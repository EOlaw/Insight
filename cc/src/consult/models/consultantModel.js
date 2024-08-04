const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialization: { type: [String], required: true }, // Array of specializations, e.g., ["Data Science", "Mathematics"]
    bio: { type: String, required: true },
    profilePicture: { type: String }, // URL to the consultant's profile picture
    available: { type: Boolean, default: true } // Availability status
}, { timestamps: true });

const Consultant = mongoose.model('Consultant', consultantSchema);
module.exports = Consultant;
