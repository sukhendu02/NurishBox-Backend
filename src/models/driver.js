// src/models/Driver.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Driver = sequelize.define(
  'Driver',
  {
    id: { 
        type: DataTypes.UUID,
         defaultValue: DataTypes.UUIDV4,
          primaryKey: true 
        },

    name: {
         type: DataTypes.STRING(100),
          allowNull: false 
        },
    mobile: {
         type: DataTypes.STRING(15),
          allowNull: false, 
          unique: true
         },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    isOnline: {
         type: DataTypes.BOOLEAN,
          allowNull: false,
           defaultValue: false
         },

         // ── Vehicle information ────────────────────────────────────
    vehicleType: DataTypes.STRING(30),
    vehicleNumber: DataTypes.STRING(20),
    currentDeviceId: DataTypes.STRING(100),
    fcmToken: DataTypes.TEXT,
    sessionVersion: {
         type: DataTypes.INTEGER,
          allowNull: false,
           defaultValue: 0
         },
    lastLat: DataTypes.DECIMAL(10, 7),
    lastLng: DataTypes.DECIMAL(10, 7),
    lastSeenAt: DataTypes.DATE,
    verifiedBy: DataTypes.UUID,
    verifiedAt: DataTypes.DATE,
    createdBy: DataTypes.UUID,
  },
  {
    tableName: 'drivers',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['status', 'is_online'] }],
  }
)

Driver.associate = (models) => {
  // Driver.hasMany(models.DriverDocument, { foreignKey: 'driverId', as: 'documents' })
  // Driver.hasMany(models.DriverKitchen, { foreignKey: 'driverId', as: 'kitchenMappings' })
  // Driver.hasMany(models.Delivery, { foreignKey: 'driverId', as: 'deliveries' })
}

export default Driver