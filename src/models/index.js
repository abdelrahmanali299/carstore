const { User } = require('./user.model');
const { Car } = require('./car.model');
const { CarImage, CarModel3D } = require('./carImage.model');

// ================================
// ASSOCIATIONS
// ================================

// User <-> Cars (seller)
User.hasMany(Car, { foreignKey: 'sellerId', as: 'listings' });
Car.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// Car <-> Images
Car.hasMany(CarImage, { foreignKey: 'carId', as: 'images', onDelete: 'CASCADE' });
CarImage.belongsTo(Car, { foreignKey: 'carId', as: 'car' });

module.exports = { User, Car, CarImage, CarModel3D };
