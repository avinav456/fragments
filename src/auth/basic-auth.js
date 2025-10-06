// src/auth/basic-auth.js

// Configure HTTP Basic Auth strategy for Passport, see:
// https://github.com/http-auth/http-auth-passport

const auth = require('http-auth');
// const passport = require('passport');
const authPassport = require('http-auth-passport');
const logger = require('../logger');

// --- NEW: Import the custom authorize middleware ---
const authorize = require('./auth-middleware');

// We expect HTPASSWD_FILE to be defined (points to .htpasswd file)
if (!process.env.HTPASSWD_FILE) {
  throw new Error('missing expected env var: HTPASSWD_FILE');
}

// Log that we're using Basic Auth for authentication
logger.info('Using HTTP Basic Auth for auth');

// Define the Basic Auth strategy for Passport
module.exports.strategy = () =>
  // For our Passport authentication strategy, we'll look for a
  // username/password pair in the Authorization header.
  authPassport(
    auth.basic({
      file: process.env.HTPASSWD_FILE,
    })
  );

// --- UPDATED: use our custom authorize middleware ---
// Previously we had:
// module.exports.authenticate = () => passport.authenticate('http', { session: false });
//
// Now we delegate authorization to our custom middleware so the user's email
// gets hashed for privacy and stored on req.user
module.exports.authenticate = () => authorize('http');
