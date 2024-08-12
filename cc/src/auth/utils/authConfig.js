const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./userModel');
const bcrypt = require('bcrypt');

module.exports = function(passport) {
  // Passport local strategy setup
  passport.use(new LocalStrategy(User.authenticate()));

  // Serialize user for the session
  passport.serializeUser(User.serializeUser());

  // Deserialize user from the session
  passport.deserializeUser(User.deserializeUser());

  // Two-factor authentication setup (example using speakeasy)
  // You would need to install the 'speakeasy' package for this
  const speakeasy = require('speakeasy');

  // Function to verify two-factor authentication
  const verify2FA = (user, token) => {
    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token
    });
  };

  // Custom callback for two-factor authentication
  passport.use('2fa', new LocalStrategy(
    function(username, password, done) {
      User.findOne({ username: username }, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (!user.verifyPassword(password)) { return done(null, false); }
        if (user.twoFactorSecret) {
          return done(null, user, { requires2FA: true });
        }
        return done(null, user);
      });
    }
  ));
};