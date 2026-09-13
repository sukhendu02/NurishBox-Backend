// src/models/KitchenUser.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const KitchenUser = sequelize.define(
  'KitchenUser',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    kitchenId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'kitchens', key: 'id' },
      onDelete: 'CASCADE',
    },

  

    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // kitchenEmail: {
    //   type: DataTypes.STRING,
    //   validate: { isEmail: true },
    // },
    // kitchenPhone: {
    //   type: DataTypes.STRING,
    // },

    // v1: every kitchen has exactly one row with role = 'kitchen_default' (shared login).
    // v2: additional rows per kitchen with role = 'staff' | 'manager' for personal logins.
    role: {
      type: DataTypes.ENUM('kitchen_default', 'staff', 'manager'),
      allowNull: false,
      defaultValue: 'kitchen_default',
    },

    // Recovery contact — deliberately separate from the login itself.
    // Set only by central ops at onboarding; used for reset links, OTP step-up,
    // and "logged out elsewhere" alerts. Never the kitchen's own operational inbox.
    recoveryContactPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recoveryContactEmail: {
      type: DataTypes.STRING,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },

    failedLoginCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lockedUntil: {
      type: DataTypes.DATE,
    },

    lastLoginAt: {
      type: DataTypes.DATE,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: 'kitchen_users',
    timestamps: true,
    underscored: true,
    paranoid: true, // soft delete — deactivating a role shouldn't erase its audit trail
    indexes: [
      { fields: ['kitchen_id'] },
      { fields: ['kitchen_id', 'role'] },
    ],
  }
)

KitchenUser.associate = (models) => {
  KitchenUser.belongsTo(models.Kitchen, { foreignKey: 'kitchenId', as: 'kitchen' })
//   KitchenUser.hasMany(models.Session, { foreignKey: 'kitchenUserId', as: 'sessions' })
//   KitchenUser.hasMany(models.LoginHistory, { foreignKey: 'kitchenUserId', as: 'loginHistory' })
//   KitchenUser.hasMany(models.SecurityEvent, { foreignKey: 'kitchenUserId', as: 'securityEvents' })
}

export default KitchenUser