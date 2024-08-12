const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
  name: { type: String, required: true }, // Name of the service
  description: { type: String, required: true }, // Detailed description of the service
  category: { type: String, required: true }, // Category of the service
  duration: { type: Number, required: true }, // Standard duration in minutes
  basePrice: { type: Number, required: true }, // Base price for the service
  isActive: { type: Boolean, default: true }, // Whether the service is currently offered
  requiredSpecializations: [{ type: String }], // Specializations required for this service
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
