const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, googleCallback, refreshToken, logout, getMe } = require('../controllers/auth.controller');
const { sendVerification, verifyPhone, forgotPassword, verifyResetOTP, resetPassword } = require('../controllers/otp.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// ── Register / Login ──
router.post('/register',
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().notEmpty(),
  ],
  validate, register
);

router.post('/login',
  [
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate, login
);

// ── Phone Verification ──
router.post('/send-verification',
  [body('phone').notEmpty().withMessage('Phone required')],
  validate, sendVerification
);

router.post('/verify-phone',
  [
    body('phone').notEmpty().withMessage('Phone required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate, verifyPhone
);

// ── Forgot Password ──
router.post('/forgot-password',
  [body('phone').notEmpty().withMessage('Phone required')],
  validate, forgotPassword
);

router.post('/verify-reset-otp',
  [
    body('phone').notEmpty().withMessage('Phone required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate, verifyResetOTP
);

router.post('/reset-password',
  [
    body('phone').notEmpty().withMessage('Phone required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 characters'),
  ],
  validate, resetPassword
);

// ── Token Management ──
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// ── Google OAuth ──
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  googleCallback
);
router.get('/google/failure', (req, res) => {
  res.status(401).json({ success: false, message: 'Google authentication failed' });
});

module.exports = router;
