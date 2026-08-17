
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'
import { User } from '../modules/auth/Models/user.js'
import Coupon from './coupon.js'
import Order from './order.js'

  const CouponRedemption = sequelize.define('CouponRedemption', {
     id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // one redemption per order — enforces single-coupon-per-order at DB level
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // frozen at redemption time, never recalculated
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'VOIDED'),
      defaultValue: 'ACTIVE', // VOIDED when order is cancelled — frees up usage count
    },
    redeemedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'coupon_redemptions',
    underscored:true,
    indexes: [
      { fields: ['coupon_id', 'user_id'] }, // fast lookup for per-user usage check
      { fields: ['coupon_id', 'status'] },  // fast lookup for total usage check
      { unique: true, fields: ['order_id'] },
    ],
  })

  CouponRedemption.associate = (models) => {
    CouponRedemption.belongsTo(models.Coupon, { foreignKey: 'couponId' })
    CouponRedemption.belongsTo(models.User, { foreignKey: 'userId' })
    CouponRedemption.belongsTo(models.Order, { foreignKey: 'orderId' })
  }

  export default CouponRedemption