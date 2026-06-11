const { User } = require('../models/index');
const { OTP } = require('../models/otp.model');
const { generateOTP, getOTPExpiry, sendVerificationEmail, sendPasswordResetEmail } = require('../config/mailer');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');

// ── Helper: create OTP and send email ──
const createAndSendOTP = async (email, firstName, type) => {
  await OTP.destroy({ where: { email, type, isUsed: false } });
  const otp = generateOTP();
  await OTP.create({ email, otp, type, expiresAt: getOTPExpiry() });

  if (type === 'email_verification') {
    await sendVerificationEmail(email, firstName, otp);
  } else {
    await sendPasswordResetEmail(email, firstName, otp);
  }
  return otp;
};

// ── Helper: verify OTP ──
const verifyOTPCode = async (email, otp, type) => {
  const record = await OTP.findOne({
    where: { email, type, isUsed: false, expiresAt: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });

  if (!record) return { valid: false, message: 'OTP expired or not found. Request a new one.' };

  if (record.attempts >= 5) {
    await record.update({ isUsed: true });
    return { valid: false, message: 'Too many wrong attempts. Request a new OTP.' };
  }

  if (record.otp !== otp) {
    await record.increment('attempts');
    const remaining = 4 - record.attempts;
    return { valid: false, message: `Wrong OTP. ${remaining} attempts remaining.` };
  }

  await record.update({ isUsed: true });
  return { valid: true };
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'Email not found' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email already verified' });

    await createAndSendOTP(email, user.firstName, 'email_verification');
    return res.json({ success: true, message: `Verification OTP sent to ${email}` });
  } catch (error) { next(error); }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTPCode(email, otp, 'email_verification');
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ isEmailVerified: true });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.json({
      success: true,
      message: 'Email verified! Welcome to CarStore 🚗',
      data: { user: user.toSafeJSON(), accessToken, refreshToken },
    });
  } catch (error) { next(error); }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || user.authProvider !== 'local') {
      return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
    }

    await createAndSendOTP(email, user.firstName, 'password_reset');
    return res.json({ success: true, message: 'Password reset OTP sent to your email' });
  } catch (error) { next(error); }
};

// POST /api/auth/verify-reset-otp
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTPCode(email, otp, 'password_reset');
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    await OTP.create({
      email,
      otp: resetToken.slice(0, 6),
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      isUsed: false,
    });

    return res.json({
      success: true,
      message: 'OTP verified. Proceed to reset your password.',
      data: { resetToken },
    });
  } catch (error) { next(error); }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const record = await OTP.findOne({
      where: { email, type: 'password_reset', isUsed: false, expiresAt: { [Op.gt]: new Date() } },
      order: [['createdAt', 'DESC']],
    });

    if (!record) return res.status(400).json({ success: false, message: 'Session expired. Please start over.' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ password: newPassword, refreshToken: null });
    await OTP.update({ isUsed: true }, { where: { email, type: 'password_reset' } });

    return res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) { next(error); }
};

module.exports = { resendVerification, verifyEmail, forgotPassword, verifyResetOTP, resetPassword };
