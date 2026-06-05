const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const {
  generateAccessToken,
  generateRefreshToken,
} = require('../middleware/auth.middleware');

// ================================
// REGISTER (Email + Password)
// ================================
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      authProvider: 'local',
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
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
// LOGIN (Email + Password)
// ================================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.authProvider} login. Please use that instead.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    return res.json({
      success: true,
      message: 'Login successful',
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
// GOOGLE OAUTH CALLBACK
// ================================
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refreshToken });

    // Redirect to Flutter deep link with tokens
    // Flutter must register this scheme: carstore://auth/callback
    const redirectUrl = `${process.env.FLUTTER_SCHEME}?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user.id}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${process.env.FLUTTER_SCHEME}?error=auth_failed`);
  }
};

// ================================
// FACEBOOK OAUTH CALLBACK
// ================================
const facebookCallback = async (req, res) => {
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
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

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
// GET ME (Current User)
// ================================
const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

module.exports = { register, login, googleCallback, facebookCallback, refreshToken, logout, getMe };
