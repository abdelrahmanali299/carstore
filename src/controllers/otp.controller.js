const { User } = require('../models/index');
const { OTP } = require('../models/otp.model');
const {
  generateOTP, getOTPExpiry,
  sendVerificationEmail, sendPasswordResetEmail,
} = require('../config/sendgrid');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');

// ================================
// Helper — create and send OTP
// ================================
const createAndSendOTP = async (email, firstName, type) => {
  // Delete any existing unused OTPs for this email+type
  await OTP.destroy({ where: { email, type, isUsed: false } });

  const otp = generateOTP();
  const expiresAt = getOTPExpiry();

  await OTP.create({ email, otp, type, expiresAt });

  if (type === 'email_verification') {
    await sendVerificationEmail(email, firstName, otp);
  } else {
    await sendPasswordResetEmail(email, firstName, otp);
  }

  return otp;
};

// ================================
// Helper — verify OTP
// ================================
const verifyOTPCode = async (email, otp, type) => {
  const record = await OTP.findOne({
    where: {
      email,
      type,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    return { valid: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  // Max 5 wrong attempts
  if (record.attempts >= 5) {
    await record.update({ isUsed: true });
    return { valid: false, message: 'Too many wrong attempts. Please request a new OTP.' };
  }

  if (record.otp !== otp) {
    await record.increment('attempts');
    const remaining = 4 - record.attempts;
    return { valid: false, message: `Wrong OTP. ${remaining} attempts remaining.` };
  }

  // Mark as used
  await record.update({ isUsed: true });
  return { valid: true };
};

// ================================
// POST /api/auth/resend-verification
// ================================
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email already verified' });

    await createAndSendOTP(email, user.firstName, 'email_verification');

    return res.json({ success: true, message: 'Verification OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/verify-email
// ================================
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyOTPCode(email, otp, 'email_verification');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ isEmailVerified: true });

    // Auto-login after verification
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to CarStore 🚗',
      data: {
        user: user.toSafeJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/forgot-password
// ================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always return success (don't reveal if email exists)
    if (!user || user.authProvider !== 'local') {
      return res.json({ success: true, message: 'If this email exists, an OTP has been sent.' });
    }

    await createAndSendOTP(email, user.firstName, 'password_reset');

    return res.json({ success: true, message: 'Password reset OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/verify-otp
// Verifies the OTP is correct before showing reset password screen
// ================================
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyOTPCode(email, otp, 'password_reset');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Create a short-lived reset token to use in next step
    const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    // Store it temporarily in a new OTP record
    await OTP.create({
      email,
      otp: resetToken.slice(0, 6), // store part of token
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min to complete reset
      isUsed: false,
    });

    return res.json({
      success: true,
      message: 'OTP verified. Proceed to reset your password.',
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/reset-password
// ================================
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Re-verify OTP one more time for security
    const record = await OTP.findOne({
      where: {
        email,
        type: 'password_reset',
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Session expired. Please start over.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update password
    await user.update({ password: newPassword, refreshToken: null });

    // Invalidate all OTPs for this email
    await OTP.update(
      { isUsed: true },
      { where: { email, type: 'password_reset' } }
    );

    return res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resendVerification,
  verifyEmail,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
