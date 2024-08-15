const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  // username: { type: String, required: true, unique: true }, // Unique identifier for the user
  email: { type: String, required: true, unique: true }, // User's email address for communication
  firstName: { type: String, required: true, trim: true, maxlength: 50 }, // User's first name
  lastName: { type: String, required: true, trim: true, maxlength: 50 }, // User's last name
  phoneNumber: { type: Number, unique: true, sparse: true, validate: { validator: function(v) { return /\d{10}/.test(v);}, message: props => `${props.value} is not a valid phone number!` }}, // Optional phone number for contact
  profile: { avatar: { data: Buffer, contentType: String } },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: [ 'male', 'female', 'prefer not to say']},
  location: { country: String, city: String, address: String, coordinates: { type: { type: String, default: 'Point' }, coordinates: { type: [Number], default: [0, 0]}}},
  role: { type: String, enum: ['client', 'consultant'], required: true }, // User's role in the system
  isAdmin: { type: Boolean, default: false }, // Boolean flag for admin status
  isDeveloper: { type: Boolean, default: false }, // Boolean flag for developer status
  createdAt: { type: Date, default: Date.now }, // Timestamp for user creation
  lastLogin: { type: Date }, // Timestamp for last login
  twoFactorSecret: { type: String }, // Secret for two-factor authentication
  isVerified: { type: Boolean, default: false }, // Email verification status
}, { timestamps: true });

// Virtual for user's full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.plugin(passportLocalMongoose); // Adds Passport-Local Mongoose functionality

const User = mongoose.model('User', userSchema);
module.exports = User;
