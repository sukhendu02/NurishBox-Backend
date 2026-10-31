// src/models/DriverKitchen.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const DriverKitchen = sequelize.define(
  'DriverKitchen',
  {
    id: {
         type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
           primaryKey: true
         },
    driverId: {
         type: DataTypes.UUID,
          allowNull: false 
        },
    kitchenId: {
         type: DataTypes.UUID,
          allowNull: false 
        },

    isActive: {
         type: DataTypes.BOOLEAN,
          allowNull: false,
           defaultValue: true
         },
  },
  {
    tableName: 'driver_kitchens',
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['driver_id', 'kitchen_id'] }, { fields: ['kitchen_id', 'is_active'] }],
  }
)

DriverKitchen.associate = (models) => {
  DriverKitchen.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' })
  DriverKitchen.belongsTo(models.Kitchen, { foreignKey: 'kitchenId', as: 'kitchen' })
}

export default DriverKitchen