// src/models/LoginHistory.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

import KitchenUser from './kitchenUser.js'

const LoginHistory = sequelize.define(
  'LoginHistory',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Nullable — an attempt against an unknown/invalid kitchen code still gets logged,
    // just without a matched user.
    kitchenUserId: {
      type: DataTypes.UUID,
      references: { model: 'kitchen_users', key: 'id' },
      onDelete: 'SET NULL',
    },

    // Raw code as entered, kept even if kitchenUserId is null — needed to spot
    // someone probing kitchen codes that don't exist.
    attemptedKitchenCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    failureReason: {
      type: DataTypes.ENUM(
        'invalid_password',
        'unknown_code',
        'account_locked',
        'rate_limited'
      ),
    },

    deviceId: {
      type: DataTypes.STRING,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.JSONB,
    },

    // Set once the resulting session ends — mirrors Session.revokedReason so this
    // row alone tells the full story of one login-to-logout cycle.
    sessionId: {
      type: DataTypes.UUID,
      references: { model: 'sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    sessionEndReason: {
      type: DataTypes.ENUM(
        'logout',
        'kicked_by_new_login',
        'force_reset_by_ops',
        'expired'
      ),
    },
  },
  {
    tableName: 'login_history',
    timestamps: true,
    underscored: true,
    paranoid: false, // append-only by design — never soft-deleted, this IS the audit trail
    indexes: [
      { fields: ['kitchen_user_id'] },
      { fields: ['attempted_kitchen_code'] },
      { fields: ['created_at'] },
      { fields: ['success'] },
    ],
  }
)

LoginHistory.associate = (models) => {
  LoginHistory.belongsTo(models.KitchenUser, { foreignKey: 'kitchenUserId', as: 'kitchenUser' })
  LoginHistory.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'session' })
}

export default LoginHistory