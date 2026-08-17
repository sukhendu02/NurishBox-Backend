import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'
import Kitchen from './kitchen.js'
import CouponRedemption from './couponRedemption.js'

  const Coupon = sequelize.define('Coupon', {
    id: {
          type:         DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey:   true,
        },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('code', value.toUpperCase().trim())
      },
    },

    title:{
      type: DataTypes.STRING,
      // allowNull: false,
    },

    description: DataTypes.STRING,

    // Scope
    scope: {
      type: DataTypes.ENUM('GLOBAL', 'KITCHEN', 'USER', 'PROMOTER'),
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // only set when scope === 'USER'
    },
    promoterId: {
      type: DataTypes.UUID,
      allowNull: true, // only set when scope === 'PROMOTER'
    },

    // Discount mechanics
    discountType: {
      type: DataTypes.ENUM('FLAT', 'PERCENT', 'FREE_DELIVERY','PERCENT_FREE_DELIVERY'),
      allowNull: false,
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // ignored when discountType === 'FREE_DELIVERY'
    },
    maxDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // relevant only for PERCENT
    },

    // Eligibility
    minOrderValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    firstOrderOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Usage limits
    usageLimitTotal: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    usageLimitPerUser: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    ishidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Validity
    startAt: DataTypes.DATE,
    endAt: DataTypes.DATE,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'coupons',
    underscored:true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['scope'] },
      { fields: ['is_active', 'start_at', 'end_at'] },
    ],
  })

  Coupon.associate = (models) => {
    // Coupon.belongsToMany(models.Kitchen, {
    //   through: 'CouponKitchens', // junction table, only populated when scope === 'KITCHEN'
    //   foreignKey: 'couponId',
    //   as: 'kitchens',
    // })
    // Coupon.belongsToMany(models.Category, {
    //   through: 'CouponCategories', // junction table, empty = applies to whole cart
    //   foreignKey: 'couponId',
    //   as: 'categories',
    // })
    Coupon.hasMany(models.CouponRedemption, {
      foreignKey: 'couponId',
      as: 'redemptions',
    })
  }

export default Coupon;