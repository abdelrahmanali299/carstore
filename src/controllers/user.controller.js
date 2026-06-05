const { User, Car, CarImage } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');

// GET /api/users/profile
const getProfile = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

// PATCH /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;

    // Avatar upload via multer-cloudinary
    if (req.file) {
      // Delete old avatar from Cloudinary
      if (req.user.avatarPublicId) {
        await deleteFromCloudinary(req.user.avatarPublicId, 'image');
      }
      updates.avatar = req.file.path;
      updates.avatarPublicId = req.file.filename;
    }

    await req.user.update(updates);

    return res.json({
      success: true,
      message: 'Profile updated',
      data: { user: req.user.toSafeJSON() },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (req.user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message: 'Password change not available for social login accounts',
      });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await req.user.update({ password: newPassword });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/my-listings
const getMyListings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { sellerId: req.user.id };
    if (status) where.status = status;

    const { count, rows: cars } = await Car.findAndCountAll({
      where,
      include: [{ model: CarImage, as: 'images' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return res.json({
      success: true,
      data: {
        cars,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/account
const deleteAccount = async (req, res, next) => {
  try {
    // Delete avatar from cloudinary
    if (req.user.avatarPublicId) {
      await deleteFromCloudinary(req.user.avatarPublicId, 'image');
    }
    await req.user.destroy();
    return res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, changePassword, getMyListings, deleteAccount };
