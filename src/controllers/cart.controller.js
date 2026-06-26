const { CartItem } = require('../models/cart.model');
const { Car } = require('../models/car.model');
const { CarImage } = require('../models/carImage.model');

/**
 * GET /api/cart
 * Returns all cart items for the authenticated user.
 */
const getCart = async (req, res) => {
  try {
    const items = await CartItem.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Car,
          as: 'car',
          include: [
            {
              model: CarImage,
              as: 'images',
              where: { isPrimary: true },
              required: false,
              limit: 1,
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const total = items.reduce((sum, item) => {
      return sum + parseFloat(item.car?.price || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        items,
        count: items.length,
        total: parseFloat(total.toFixed(2)),
      },
    });
  } catch (err) {
    console.error('getCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
};

/**
 * POST /api/cart
 * Body: { carId }
 * Adds a car to the authenticated user's cart.
 */
const addToCart = async (req, res) => {
  try {
    const { carId } = req.body;

    // Verify car exists and is available
    const car = await Car.findOne({ where: { id: carId, status: 'available' } });
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found or unavailable' });
    }

    // Prevent users from adding their own listings
    if (car.sellerId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot add your own listing to the cart' });
    }

    const [item, created] = await CartItem.findOrCreate({
      where: { userId: req.user.id, carId },
    });

    if (!created) {
      return res.status(409).json({ success: false, message: 'Car is already in your cart' });
    }

    // Return the new item with car details
    const populated = await CartItem.findByPk(item.id, {
      include: [{ model: Car, as: 'car' }],
    });

    res.status(201).json({ success: true, message: 'Car added to cart', data: populated });
  } catch (err) {
    console.error('addToCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
};

/**
 * DELETE /api/cart/:carId
 * Removes a specific car from the authenticated user's cart.
 */
const removeFromCart = async (req, res) => {
  try {
    const { carId } = req.params;

    const deleted = await CartItem.destroy({
      where: { userId: req.user.id, carId },
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    res.json({ success: true, message: 'Car removed from cart' });
  } catch (err) {
    console.error('removeFromCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove from cart' });
  }
};

/**
 * DELETE /api/cart
 * Clears all items from the authenticated user's cart.
 */
const clearCart = async (req, res) => {
  try {
    await CartItem.destroy({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    console.error('clearCart error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};

module.exports = { getCart, addToCart, removeFromCart, clearCart };
