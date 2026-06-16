const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, googleCallback, refreshToken, logout, getMe } = require('../controllers/auth.controller');
const { resendVerification, verifyEmail, forgotPassword, verifyResetOTP, resetPassword } = require('../controllers/otp.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// Register / Login
router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('firstName').notEmpty().withMessage('First name required'),
  ],
  validate, register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate, login
);

// Email Verification
router.post('/resend-verification',
  [body('email').isEmail().normalizeEmail()],
  validate, resendVerification
);

router.post('/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate, verifyEmail
);

// Forgot Password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate, forgotPassword
);

router.post('/verify-reset-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate, verifyResetOTP
);

router.post('/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 characters'),
  ],
  validate, resetPassword
);

// Token Management
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  googleCallback
);
router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Google authentication failed' });
});
const { register, login, googleCallback, googleMobileAuth, refreshToken, logout, getMe } = require('../controllers/auth.controller');

// Add this route
router.post('/google/mobile',
  [body('idToken').notEmpty().withMessage('idToken required')],
  validate,
  googleMobileAuth
);
module.exports = router;
