// src/models/Payment.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    orderId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true, // one payment per order
    },

    // ── Payment method ────────────────────────────────────────────
    method: {
      type: DataTypes.ENUM(
        'RAZORPAY', // online payment
        'COD'       // cash on delivery
      ),
      allowNull: false,
    },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM(
        'PENDING',   // awaiting payment
        'PAID',      // successfully paid
        'FAILED',    // payment failed
        'REFUNDED',  // refund processed
        'CANCELLED'  // cancelled before payment
      ),
      defaultValue: 'PENDING',
      allowNull:    false,
    },

    // ── Amount ────────────────────────────────────────────────────
    amount: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type:         DataTypes.STRING(5),
      defaultValue: 'INR',
      allowNull:    false,
    },

    // ── Razorpay fields (null for COD) ───────────────────────────
    razorpayOrderId: {
      type:      DataTypes.STRING,
      allowNull: true,
      // from Razorpay order creation
    },
    razorpayPaymentId: {
      type:      DataTypes.STRING,
      allowNull: true,
      // from Razorpay after successful payment
    },
    razorpaySignature: {
      type:      DataTypes.STRING,
      allowNull: true,
      // HMAC signature for verification
    },

    // ── Refund ────────────────────────────────────────────────────
    refundId: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    refundAmt: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    refundedAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Timestamps ───────────────────────────────────────────────
    paidAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    failedAt: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    failureMessage: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName:   'payments',
    timestamps:  true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['order_id'] },
      { fields: ['status'] },
      { fields: ['razorpay_order_id'] },
      { fields: ['razorpay_payment_id'] },
    ],
  }
)

Payment.associate = (models) => {
  Payment.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' })
}

export default Payment