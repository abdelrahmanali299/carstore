const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { getCart, addToCart, removeFromCart, clearCart } = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart — get current user's cart
router.get('/', getCart);

// POST /api/cart — add a car to the cart
router.post(
  '/',
  [
    body('carId').notEmpty().isUUID().withMessage('Valid carId (UUID) is required'),
  ],
  validate,
  addToCart
);

// DELETE /api/cart/:carId — remove a specific car from the cart
router.delete('/:carId', removeFromCart);

// DELETE /api/cart — clear the entire cart
router.delete('/', clearCart);

module.exports = router;
