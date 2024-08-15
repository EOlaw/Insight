const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    unique: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  category: { 
    type: String, 
    required: true,
    enum: ['Business', 'Technology', 'Finance', 'Legal', 'Healthcare', 'Education', 'Other']
  },
  subCategory: {
    type: String,
    trim: true
  },
  duration: { 
    type: Number, 
    required: true,
    min: 15,
    max: 480 // Max 8 hours
  },
  basePrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY'] // Add more as needed
  },
  priceModel: {
    type: String,
    enum: ['Fixed', 'Hourly', 'Variable'],
    default: 'Fixed'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  requiredSpecializations: [{ 
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  imageUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(http|https):\/\/[^ "]+$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  availableOnline: {
    type: Boolean,
    default: true
  },
  availableInPerson: {
    type: Boolean,
    default: false
  },
  minimumNoticeTime: {
    type: Number,
    default: 24, // hours
    min: 0
  },
  cancellationPolicy: {
    type: String,
    enum: ['Flexible', 'Moderate', 'Strict'],
    default: 'Moderate'
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  faqs: [{
    question: String,
    answer: String
  }],
  prerequisites: [{ 
    type: String,
    trim: true
  }],
  additionalOptions: [{
    name: String,
    description: String,
    price: Number
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  return `${this.basePrice.toFixed(2)} ${this.currency}`;
});

// Index for efficient querying
serviceSchema.index({ name: 1, category: 1, isActive: 1 });

// Method to calculate total price including additional options
serviceSchema.methods.calculateTotalPrice = function(selectedOptions = []) {
  let total = this.basePrice;
  selectedOptions.forEach(option => {
    const additionalOption = this.additionalOptions.find(o => o.name === option);
    if (additionalOption) {
      total += additionalOption.price;
    }
  });
  return total;
};

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;