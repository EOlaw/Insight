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
  specializations: [{ type: String }], // Array of specializations offered by this service
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
    min: 0,
    set: v => Math.round(v * 100) / 100 // Rounds to 2 decimal places
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
    price: {
      type: Number,
      min: 0,
      set: v => Math.round(v * 100) / 100 // Rounds to 2 decimal places
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update the virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  if (typeof this.basePrice === 'number' && !isNaN(this.basePrice) && this.currency) {
    return `${this.basePrice.toFixed(2)} ${this.currency}`;
  }
  return 'Price not available';
});

// Index for efficient querying
serviceSchema.index({ name: 1, category: 1, isActive: 1 });

// Method to calculate total price including additional options
serviceSchema.methods.calculateTotalPrice = function(selectedOptions = [], duration) {
  let total = this.basePrice;

  // If the price model is hourly, adjust the base price for the duration
  if (this.priceModel === 'Hourly') {
    total = (this.basePrice / 60) * duration;
  }

  selectedOptions.forEach(option => {
    const additionalOption = this.additionalOptions.find(o => o.name === option);
    if (additionalOption) {
      total += additionalOption.price;
    }
  });

  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;