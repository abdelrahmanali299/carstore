const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define(
  'OTP',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('phone_verification', 'password_reset'),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'otps',
    timestamps: true,
    indexes: [
      { fields: ['phone'] },
      { fields: ['type'] },
    ],
  }
);

module.exports = { OTP };
