const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const { OTP } = require('../models/otp.model');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { generateOTP, getOTPExpiry, sendVerificationEmail } = require('../config/mailer');

// REGISTER
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      email, password, firstName, lastName, phone,
      authProvider: 'local',
      isEmailVerified: false,
    });

    // Send OTP via email
    const otp = generateOTP();
    await OTP.create({ email, otp, type: 'email_verification', expiresAt: getOTPExpiry() });
    await sendVerificationEmail(email, firstName, otp);

    return res.status(201).json({
      success: true,
      message: 'Account created! Check your email for the verification OTP.',
      data: { email, firstName },
    });
  } catch (error) { next(error); }
};

// LOGIN
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (user.authProvider !== 'local') {
      return res.status(400).json({ success: false, message: `This account uses ${user.authProvider} login.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    // If email not verified — resend OTP
    if (!user.isEmailVerified) {
      const otp = generateOTP();
      await OTP.destroy({ where: { email, type: 'email_verification', isUsed: false } });
      await OTP.create({ email, otp, type: 'email_verification', expiresAt: getOTPExpiry() });
      await sendVerificationEmail(email, user.firstName, otp);

      return res.status(403).json({
        success: false,
        message: 'Email not verified. A new OTP has been sent to your email.',
        data: { requiresVerification: true, email },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.toSafeJSON(), accessToken, refreshToken },
    });
  } catch (error) { next(error); }
};

// GOOGLE CALLBACK
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });
    return res.redirect(`${process.env.FLUTTER_SCHEME}?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user.id}`);
  } catch (error) {
    res.redirect(`${process.env.FLUTTER_SCHEME}?error=auth_failed`);
  }
};

// REFRESH TOKEN
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    let payload;
    try { payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }

    const user = await User.findByPk(payload.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await user.update({ refreshToken: newRefreshToken });

    return res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (error) { next(error); }
};

// LOGOUT
const logout = async (req, res, next) => {
  try {
    await req.user.update({ refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

// GET ME
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

module.exports = { register, login, googleCallback, refreshToken, logout, getMe };
