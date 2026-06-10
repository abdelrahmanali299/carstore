const { User } = require('../models/index');
const { OTP } = require('../models/otp.model');
const { generateOTP, getOTPExpiry, sendOTPSms } = require('../config/twilio');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');

// ================================
// Helper — create OTP and send SMS
// ================================
const createAndSendOTP = async (phone, type) => {
  // Delete old unused OTPs for this phone+type
  await OTP.destroy({ where: { phone, type, isUsed: false } });

  const otp = generateOTP();
  const expiresAt = getOTPExpiry();

  await OTP.create({ phone, otp, type, expiresAt });
  await sendOTPSms(phone, otp, type);

  return otp;
};

// ================================
// Helper — verify OTP code
// ================================
const verifyOTPCode = async (phone, otp, type) => {
  const record = await OTP.findOne({
    where: {
      phone,
      type,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    return { valid: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  if (record.attempts >= 5) {
    await record.update({ isUsed: true });
    return { valid: false, message: 'Too many wrong attempts. Please request a new OTP.' };
  }

  if (record.otp !== otp) {
    await record.increment('attempts');
    const remaining = 4 - record.attempts;
    return { valid: false, message: `Wrong OTP. ${remaining} attempts remaining.` };
  }

  await record.update({ isUsed: true });
  return { valid: true };
};

// ================================
// POST /api/auth/send-verification
// Send OTP to verify phone on register
// ================================
const sendVerification = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ success: false, message: 'Phone number not found' });
    if (user.isPhoneVerified) return res.status(400).json({ success: false, message: 'Phone already verified' });

    await createAndSendOTP(phone, 'phone_verification');

    return res.json({ success: true, message: `Verification OTP sent to ${phone}` });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/verify-phone
// ================================
const verifyPhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const result = await verifyOTPCode(phone, otp, 'phone_verification');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ isPhoneVerified: true });

    // Auto-login after verification
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.json({
      success: true,
      message: 'Phone verified successfully! Welcome to CarStore 🚗',
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
    const { phone } = req.body;

    const user = await User.findOne({ where: { phone } });

    // Always return success — don't reveal if phone exists
    if (!user || user.authProvider !== 'local') {
      return res.json({ success: true, message: 'If this number is registered, an OTP has been sent.' });
    }

    await createAndSendOTP(phone, 'password_reset');

    return res.json({ success: true, message: 'Password reset OTP sent to your phone' });
  } catch (error) {
    next(error);
  }
};

// ================================
// POST /api/auth/verify-reset-otp
// ================================
const verifyResetOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const result = await verifyOTPCode(phone, otp, 'password_reset');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Issue a short-lived reset token
    const resetToken = Buffer.from(`${phone}:${Date.now()}`).toString('base64');

    // Store temporarily
    await OTP.create({
      phone,
      otp: resetToken.slice(0, 6),
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
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
    const { phone, newPassword } = req.body;

    // Check valid session exists
    const record = await OTP.findOne({
      where: {
        phone,
        type: 'password_reset',
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Session expired. Please start over.' });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ password: newPassword, refreshToken: null });

    // Invalidate all OTPs for this phone
    await OTP.update(
      { isUsed: true },
      { where: { phone, type: 'password_reset' } }
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
  sendVerification,
  verifyPhone,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
