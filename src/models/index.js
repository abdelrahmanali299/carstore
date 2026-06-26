const { User } = require('./user.model');
const { Car } = require('./car.model');
const { CarImage, CarModel3D } = require('./carImage.model');
const { OTP } = require('./otp.model');
const { CartItem } = require('./cart.model');

// Associations
User.hasMany(Car, { foreignKey: 'sellerId', as: 'listings' });
Car.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Car.hasMany(CarImage, { foreignKey: 'carId', as: 'images', onDelete: 'CASCADE' });
CarImage.belongsTo(Car, { foreignKey: 'carId', as: 'car' });

// Cart associations
User.hasMany(CartItem, { foreignKey: 'userId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Car.hasMany(CartItem, { foreignKey: 'carId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(Car, { foreignKey: 'carId', as: 'car' });

module.exports = { User, Car, CarImage, CarModel3D, OTP, CartItem };
