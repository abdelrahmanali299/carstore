const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const router = express.Router();

const {
  register, login, googleCallback, facebookCallback,
  refreshToken, logout, getMe,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// ── Email / Password ──
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name required'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

// ── Refresh / Logout ──
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// ── Google OAuth ──
// Step 1: Redirect to Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
// Step 2: Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  googleCallback
);
router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Google authentication failed' });
});

// ── Facebook OAuth ──
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/api/auth/facebook/failure' }),
  facebookCallback
);
router.get('/facebook/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Facebook authentication failed' });
});

module.exports = router;
