const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getCars, getCarById, createCar, updateCar,
  deleteCar, getFilterOptions, getFeaturedCars,
} = require('../controllers/car.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { uploadCarModel } = require('../config/cloudinary');
const { validate } = require('../middleware/validate.middleware');

// Public routes
router.get('/', getCars);
router.get('/featured', getFeaturedCars);
router.get('/filter-options', getFilterOptions);
router.get('/:id', optionalAuth, getCarById);

// Protected routes
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

router.delete('/:id', authenticate, deleteCar);

module.exports = router;
