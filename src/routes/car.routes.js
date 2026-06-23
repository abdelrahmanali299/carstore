const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getCars, getCarById, createCar, updateCar,
  deleteCar, getFilterOptions, getFeaturedCars,
} = require('../controllers/car.controller');

const {
  uploadCarImages: uploadCarImagesHandler,
  getCarImages,
  deleteCarImage,
  setPrimaryImage,
  reorderCarImages,
} = require('../controllers/carImage.controller');

const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { uploadCarModel, uploadCarImages } = require('../config/cloudinary');
const { validate } = require('../middleware/validate.middleware');

// ─── Car routes ──────────────────────────────────────────────────────────────

// Public
router.get('/', getCars);
router.get('/featured', getFeaturedCars);
router.get('/filter-options', getFilterOptions);
router.get('/:id', optionalAuth, getCarById);

// Protected — create car (with optional 3D model)
router.post(
  '/',
  authenticate,
  (req, res, next) => {
    uploadCarModel(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  [
    body('brand').notEmpty().withMessage('Brand is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('year').isInt({ min: 1900 }).withMessage('Valid year required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  ],
  validate,
  createCar
);

// Protected — update car
router.patch(
  '/:id',
  authenticate,
  (req, res, next) => {
    uploadCarModel(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  updateCar
);

// Protected — delete car
router.delete('/:id', authenticate, deleteCar);

// ─── Car image sub-routes ─────────────────────────────────────────────────────

// GET  /api/cars/:id/images              — list all images
router.get('/:id/images', getCarImages);

// POST /api/cars/:id/images              — upload up to 10 images (multipart field: "images")
router.post(
  '/:id/images',
  authenticate,
  (req, res, next) => {
    uploadCarImages(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  uploadCarImagesHandler
);

// DELETE /api/cars/:id/images/:imageId   — delete one image
router.delete('/:id/images/:imageId', authenticate, deleteCarImage);

// PATCH  /api/cars/:id/images/:imageId/primary — set primary image
router.patch('/:id/images/:imageId/primary', authenticate, setPrimaryImage);

// PATCH  /api/cars/:id/images/reorder    — reorder images
// Body: { order: ["id1", "id2", ...] }
router.patch('/:id/images/reorder', authenticate, reorderCarImages);

module.exports = router;
