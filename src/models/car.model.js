const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Car = sequelize.define(
  'Car',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    brand: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1900, max: new Date().getFullYear() + 1 },
    },
    trim: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    condition: {
      type: DataTypes.ENUM('new', 'used', 'certified_pre_owned'),
      defaultValue: 'used',
    },
    mileage: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    // Each car has its own 3D model uploaded to Cloudinary
    modelType: { type: DataTypes.STRING, allowNull: true }, // e.g. "mercedes_c40"
    model3dUrl: { type: DataTypes.TEXT, allowNull: true },  // Cloudinary .glb URL
    model3dPublicId: { type: DataTypes.STRING, allowNull: true },
    fuelType: {
      type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'),
      allowNull: true,
    },
    transmission: { type: DataTypes.ENUM('automatic', 'manual', 'cvt'), allowNull: true },
    driveType: { type: DataTypes.ENUM('fwd', 'rwd', 'awd', '4wd'), allowNull: true },
    engineSize: { type: DataTypes.STRING, allowNull: true },
    horsepower: { type: DataTypes.INTEGER, allowNull: true },
    color: { type: DataTypes.STRING, allowNull: true },
    doors: { type: DataTypes.INTEGER, defaultValue: 4 },
    seats: { type: DataTypes.INTEGER, defaultValue: 5 },
    features: { type: DataTypes.JSONB, defaultValue: [] },
    location: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, defaultValue: 'EG' },
    rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('available', 'sold', 'reserved', 'hidden'),
      defaultValue: 'available',
    },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'cars',
    timestamps: true,
    indexes: [
      { fields: ['brand'] },
      { fields: ['price'] },
      { fields: ['condition'] },
      { fields: ['status'] },
      { fields: ['city'] },
      { fields: ['year'] },
      { fields: ['sellerId'] },
    ],
  }
);

module.exports = { Car };
