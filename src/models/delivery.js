// src/models/Delivery.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'
// import Order from './order.js'
// import Kitchen from './kitchen.js'
// import Driver from '../driver.js'
// import CashDeposit from '../cashDeposit.js'
// import DeliveryStatusLog from '../deliveryStatusLog.js'
const Delivery = sequelize.define(
  'Delivery',
  {
    id: {
       type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
         primaryKey: true 
        },
    orderId: {
       type: DataTypes.UUID,
        allowNull: false,
         unique: true 
        },
    orderNumber: { type: DataTypes.STRING,
       allowNull: false
       },
    kitchenId: {
       type: DataTypes.UUID,
        allowNull: false 
      },
    driverId: {
       type: DataTypes.UUID,
        allowNull: true
       },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'AVAILABLE',
    },
    paymentMode: {
       type: DataTypes.ENUM('ONLINE', 'COD'),
        allowNull: false 
      },
    codAmount: {
       type: DataTypes.DECIMAL(12, 2),
        allowNull: false, 
        defaultValue: 0
       },
    codCollectedAmount: DataTypes.DECIMAL(12, 2),
    codCollectedAt: DataTypes.DATE,
    cashDepositId: DataTypes.UUID,
    deliveryFee: { 
      type: DataTypes.DECIMAL(12, 2),
       allowNull: false,
        defaultValue: 0
       },
    dropLat: DataTypes.DECIMAL(10, 7),
    dropLng: DataTypes.DECIMAL(10, 7),
    dropAddress: DataTypes.TEXT,
    customerName: DataTypes.STRING(100),
    customerMobile: DataTypes.STRING(15),
    cancelReason: DataTypes.TEXT,
    assignedAt: DataTypes.DATE,
    pickedUpAt: DataTypes.DATE,
    deliveredAt: DataTypes.DATE,
    version: {
       type: DataTypes.INTEGER,
        allowNull: false,
         defaultValue: 0
         },
  },
  {
    tableName: 'deliveries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['kitchen_id', 'status'] },
      { fields: ['driver_id', 'status'] },
      { fields: ['driver_id', 'delivered_at'] },
      { fields: ['driver_id', 'cash_deposit_id'] },
    ],
  }
)

Delivery.associate = (models) => {
  Delivery.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' })
  Delivery.belongsTo(models.Kitchen, { foreignKey: 'kitchenId', as: 'kitchen' })
  Delivery.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' })
  Delivery.belongsTo(models.CashDeposit, { foreignKey: 'cashDepositId', as: 'cashDeposit' })
  Delivery.hasMany(models.DeliveryStatusLog, { foreignKey: 'deliveryId', as: 'logs' })
}

export default Delivery