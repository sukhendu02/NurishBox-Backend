// src/models/DriverOtp.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const DriverOtp = sequelize.define(
  'DriverOtp',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    mobile: { type: DataTypes.STRING(15), allowNull: false },
    otpHash: { type: DataTypes.STRING(100), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    usedAt: DataTypes.DATE,
  },
  {
    tableName: 'driver_otps',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ['mobile', 'created_at'] }],
  }
)

export default DriverOtp