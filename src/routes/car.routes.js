const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getCars, getCarById, createCar, updateCar,
  deleteCar, getFilterOptions, getFeaturedCars,
} = require('../controllers/car.controller');

const {
  addCarImages,
  getCarImages,
  deleteCarImage,
  setPrimaryImage,
  reorderCarImages,
} = require('../controllers/carImage.controller');

const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { uploadCarModel } = require('../config/cloudinary');
const { validate } = require('../middleware/validate.middleware');

// ─── Car routes ───────────────────────────────────────────────────────────────

// Public
router.get('/', getCars);
router.get('/featured', getFeaturedCars);
router.get('/filter-options', getFilterOptions);
router.get('/:id', optionalAuth, getCarById);

// Protected — create car (with optional 3D model upload)
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

// ─── Car image sub-routes (no file upload — you send Cloudinary URLs) ─────────

// GET    /api/cars/:id/images
router.get('/:id/images', getCarImages);

// POST   /api/cars/:id/images
// Body (JSON): { "images": [{ "url": "https://...", "publicId": "carstore/..." }, ...] }
router.post(
  '/:id/images',
  authenticate,
  [
    body('images').isArray({ min: 1 }).withMessage('images must be a non-empty array'),
    body('images.*.url').notEmpty().isURL().withMessage('Each image must have a valid url'),
    body('images.*.publicId').notEmpty().withMessage('Each image must have a publicId'),
  ],
  validate,
  addCarImages
);

// DELETE /api/cars/:id/images/:imageId
router.delete('/:id/images/:imageId', authenticate, deleteCarImage);

// PATCH  /api/cars/:id/images/:imageId/primary
router.patch('/:id/images/:imageId/primary', authenticate, setPrimaryImage);

// PATCH  /api/cars/:id/images/reorder
// Body (JSON): { "order": ["imageId1", "imageId2", ...] }
router.patch(
  '/:id/images/reorder',
  authenticate,
  [
    body('order').isArray({ min: 1 }).withMessage('order must be a non-empty array of image IDs'),
  ],
  validate,
  reorderCarImages
);

module.exports = router;
