const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true }, // Unique identifier for the user
  email: { type: String, required: true, unique: true }, // User's email address for communication
  firstName: { type: String, required: true }, // User's first name
  lastName: { type: String, required: true }, // User's last name
  phoneNumber: { type: Number, unique: true }, // Optional phone number for contact
  role: { type: String, enum: ['client', 'consultant', 'staff'], required: true }, // User's role in the system
  isAdmin: { type: Boolean, default: false }, // Boolean flag for admin status
  isDeveloper: { type: Boolean, default: false }, // Boolean flag for developer status
  createdAt: { type: Date, default: Date.now }, // Timestamp for user creation
  lastLogin: { type: Date }, // Timestamp for last login
  twoFactorSecret: { type: String }, // Secret for two-factor authentication
  isVerified: { type: Boolean, default: false }, // Email verification status
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose); // Adds Passport-Local Mongoose functionality

const User = mongoose.model('User', userSchema);
module.exports = User;
