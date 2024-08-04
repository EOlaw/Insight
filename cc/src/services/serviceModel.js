const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // E.g., "Data Science", "Business Acumen"
    price: { type: Number, required: true },    // Price of the service
    duration: { type: Number, required: true }  // Duration in minutes
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
