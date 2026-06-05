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
    // ── Basic Info ──
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1900, max: new Date().getFullYear() + 1 },
    },
    trim: {
      type: DataTypes.STRING,
      allowNull: true, // e.g. "Sport", "Limited", "Base"
    },
    // ── Pricing ──
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    originalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true, // For showing discounts
    },
    // ── Condition ──
    condition: {
      type: DataTypes.ENUM('new', 'used', 'certified_pre_owned'),
      defaultValue: 'used',
    },
    mileage: {
      type: DataTypes.INTEGER,
      allowNull: true, // 0 for new cars
      defaultValue: 0,
    },
    // ── 3D Model (Cloudinary) ──
    // Maps car to one of your 3 pre-uploaded 3D models
    modelType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // The actual Cloudinary URL of the 3D model (.glb)
    model3dUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    model3dPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ── Specs ──
    fuelType: {
      type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'),
      allowNull: true,
    },
    transmission: {
      type: DataTypes.ENUM('automatic', 'manual', 'cvt'),
      allowNull: true,
    },
    driveType: {
      type: DataTypes.ENUM('fwd', 'rwd', 'awd', '4wd'),
      allowNull: true,
    },
    engineSize: {
      type: DataTypes.STRING,
      allowNull: true, // e.g. "2.0L", "3.5L"
    },
    horsepower: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    doors: {
      type: DataTypes.INTEGER,
      defaultValue: 4,
    },
    seats: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    // ── Features (stored as JSON array) ──
    features: {
      type: DataTypes.JSONB, // ["Cruise Control", "Bluetooth", "Backup Camera"]
      defaultValue: [],
    },
    // ── Location ──
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'EG', // Egypt
    },
    // ── Ratings ──
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // ── Status ──
    status: {
      type: DataTypes.ENUM('available', 'sold', 'reserved', 'hidden'),
      defaultValue: 'available',
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // ── Owner (seller) ──
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'cars',
    timestamps: true,
    indexes: [
      { fields: ['brand'] },
      { fields: ['price'] },
      { fields: ['condition'] },
      { fields: ['modelType'] },
      { fields: ['status'] },
      { fields: ['city'] },
      { fields: ['year'] },
      { fields: ['sellerId'] },
    ],
  }
);

module.exports = { Car };
