const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CartItem = sequelize.define(
  'CartItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    carId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'cars', key: 'id' },
    },
  },
  {
    tableName: 'cart_items',
    timestamps: true,
    indexes: [
      // A user can only add a car once
      { unique: true, fields: ['userId', 'carId'] },
      { fields: ['userId'] },
    ],
  }
);

module.exports = { CartItem };
