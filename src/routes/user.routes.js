const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getProfile, updateProfile, changePassword, getMyListings, deleteAccount,
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../config/cloudinary');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate); // All user routes require auth

router.get('/profile', getProfile);
router.patch(
  '/profile',
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  updateProfile
);

router.patch(
  '/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validate,
  changePassword
);

router.get('/my-listings', getMyListings);
router.delete('/account', deleteAccount);

module.exports = router;
