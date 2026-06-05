const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarImage = sequelize.define(
  'CarImage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    carId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'cars', key: 'id' },
      onDelete: 'CASCADE',
    },
    url: {
      type: DataTypes.TEXT, // Cloudinary URL
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING, // Cloudinary public_id (needed for deletion)
      allowNull: false,
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // First image = primary (thumbnail)
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'car_images',
    timestamps: true,
  }
);

// 3D Model table — stores the 3 pre-uploaded models
const CarModel3D = sequelize.define(
  'CarModel3D',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    modelType: {
      type: DataTypes.ENUM('sedan', 'suv', 'truck'),
      allowNull: false,
      unique: true, // Only 1 model per type
    },
    url: {
      type: DataTypes.TEXT, // Cloudinary .glb URL
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.TEXT, // Preview image for the 3D model
      allowNull: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true, // e.g. "Compact Sedan", "Family SUV"
    },
  },
  {
    tableName: 'car_models_3d',
    timestamps: true,
  }
);

module.exports = { CarImage, CarModel3D };
