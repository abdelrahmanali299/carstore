const express = require('express');
const router = express.Router();
const {
  getModels, getModelByType, uploadModel, updateThumbnail, deleteModel,
} = require('../controllers/model.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { uploadModel: uploadModelFile, uploadAvatar } = require('../config/cloudinary');

// Public - anyone can view the 3D models
router.get('/', getModels);
router.get('/:modelType', getModelByType);

// Admin only - upload/replace/delete 3D models
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadModelFile.single('model')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  uploadModel
);

router.patch(
  '/:modelType/thumbnail',
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  updateThumbnail
);

router.delete('/:modelType', authenticate, requireAdmin, deleteModel);

module.exports = router;
