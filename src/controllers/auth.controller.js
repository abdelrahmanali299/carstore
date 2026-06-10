const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const { OTP } = require('../models/otp.model');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth.middleware');
const { generateOTP, getOTPExpiry, sendOTPSms } = require('../config/twilio');

// ================================
// REGISTER — sends SMS OTP after signup
// ================================
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    const user = await User.create({
      email, password, firstName, lastName, phone,
      authProvider: 'local',
      isPhoneVerified: false,
    });

    // Send OTP via SMS if phone provided
    if (phone) {
      const otp = generateOTP();
      await OTP.create({
        phone,
        otp,
        type: 'phone_verification',
        expiresAt: getOTPExpiry(),
      });
      await sendOTPSms(phone, otp, 'phone_verification');

      return res.status(201).json({
        success: true,
        message: 'Account created! OTP sent to your phone number.',
        data: { phone, firstName },
      });
    }

    // No phone — auto verify and return token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { user: user.toSafeJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// LOGIN
// ================================
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    const where = email ? { email } : { phone };
    const user = await User.findOne({ where });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.authProvider} login.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // If phone not verified — resend OTP
    if (user.phone && !user.isPhoneVerified) {
      const otp = generateOTP();
      await OTP.destroy({ where: { phone: user.phone, type: 'phone_verification', isUsed: false } });
      await OTP.create({ phone: user.phone, otp, type: 'phone_verification', expiresAt: getOTPExpiry() });
      await sendOTPSms(user.phone, otp, 'phone_verification');

      return res.status(403).json({
        success: false,
        message: 'Phone not verified. A new OTP has been sent.',
        data: { requiresVerification: true, phone: user.phone },
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
  } catch (error) {
    next(error);
  }
};

// ================================
// GOOGLE OAUTH CALLBACK
// ================================
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });
    const redirectUrl = `${process.env.FLUTTER_SCHEME}?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user.id}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.FLUTTER_SCHEME}?error=auth_failed`);
  }
};

// ================================
// REFRESH TOKEN
// ================================
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findByPk(payload.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await user.update({ refreshToken: newRefreshToken });

    return res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// LOGOUT
// ================================
const logout = async (req, res, next) => {
  try {
    await req.user.update({ refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ================================
// GET ME
// ================================
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

module.exports = { register, login, googleCallback, refreshToken, logout, getMe };
