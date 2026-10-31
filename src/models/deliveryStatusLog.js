// src/models/DeliveryStatusLog.js
// Append-only audit log. Never update or delete.
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const DeliveryStatusLog = sequelize.define(
  'DeliveryStatusLog',
  {
    id: { 
      type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      
    deliveryId: { type: DataTypes.UUID, allowNull: false },
    fromStatus: DataTypes.STRING(15),
    toStatus: { type: DataTypes.STRING(15), allowNull: false },
    actorType: { type: DataTypes.ENUM('DRIVER', 'SYSTEM', 'ADMIN'), allowNull: false },
    actorId: DataTypes.UUID,
    lat: DataTypes.DECIMAL(10, 7),
    lng: DataTypes.DECIMAL(10, 7),
    note: DataTypes.TEXT,
  },
  {
    tableName: 'delivery_status_logs',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    underscored: true,
    indexes: [{ fields: ['delivery_id', 'created_at'] }],
  }
)

DeliveryStatusLog.associate = (models) => {
  DeliveryStatusLog.belongsTo(models.Delivery, { foreignKey: 'deliveryId', as: 'delivery' })
}

export default DeliveryStatusLog