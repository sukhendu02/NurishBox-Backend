// src/models/Order.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Order = sequelize.define(
  'Order',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Relations ─────────────────────────────────────────────────
    userId: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    addressId: {
      type:      DataTypes.UUID,
      allowNull: false,
    },

    // ── Order Number ──────────────────────────────────────────────
    // Format: NB-20250517-0001
    orderNumber: {
      type:      DataTypes.STRING,
      allowNull: false,
      unique:    true,
    },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM(
        'PENDING',           // created, awaiting payment
        'CONFIRMED',         // payment done OR COD accepted
        'PREPARING',         // kitchen started
        'OUT_FOR_DELIVERY',  // with delivery partner
        'DELIVERED',         // successfully delivered
        'CANCELLED',         // cancelled by user / admin / system
        'REFUNDED'           // refund processed
      ),
      defaultValue: 'PENDING',
      allowNull:    false,
    },

    // ── Pricing breakdown ─────────────────────────────────────────
    subtotal: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    deliveryFee: {
      type:         DataTypes.DECIMAL(8, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    discountAmt: {
      type:         DataTypes.DECIMAL(8, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    taxAmt: {
      type:         DataTypes.DECIMAL(8, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    totalAmt: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // ── Coupon ────────────────────────────────────────────────────
    couponCode: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    couponId: {
  type: DataTypes.UUID,
  allowNull: true,
},
couponDiscountAmount: {
  type: DataTypes.DECIMAL(10, 2),
  allowNull: false,
  defaultValue: 0,
},

    // ── Notes ─────────────────────────────────────────────────────
    specialInstr: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Status timestamps ─────────────────────────────────────────
    confirmedAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    preparingAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    outForDeliveryAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Cancellation details ──────────────────────────────────────
    cancellationReason: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    cancelledBy: {
      type:      DataTypes.ENUM('USER', 'ADMIN', 'SYSTEM'),
      allowNull: true,
    },


    idempotencyKey:{
      type:DataTypes.STRING,
      unique:true,
    }
  },
  {
    tableName:   'orders',
    timestamps:  true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['order_number'] },
      { fields: ['created_at'] },
    ],
  }
)

Order.associate = (models) => {
  Order.belongsTo(models.User,    { foreignKey: 'userId',    as: 'user'    })
  Order.belongsTo(models.Address, { foreignKey: 'addressId', as: 'address' })
  Order.belongsTo(models.Coupon, { foreignKey: 'couponId', as: 'coupon' })
  Order.hasMany(models.OrderItem, { foreignKey: 'orderId',   as: 'items',  onDelete: 'CASCADE' })
  Order.hasOne(models.Payment,    { foreignKey: 'orderId',   as: 'payment' })
}

export default Order