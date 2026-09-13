// src/models/Session.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Session = sequelize.define(
  'Session',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    kitchenUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'kitchen_users', key: 'id' },
      onDelete: 'CASCADE',
    },

    // Registered device identifier (fingerprint or app-installation id).
    // First login from a new deviceId should be flagged — feeds step-up verification.
    deviceId: {
      type: DataTypes.STRING,
      // allowNull: false,
    },
    deviceLabel: {
      type: DataTypes.STRING, // e.g. "Counter Tablet 1" — human-readable, optional
    },

    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Resolved from IP (city-level) or device GPS if the app has permission.
    // Shape: { city, region, country, lat, lng, source: 'ip' | 'gps' }
    location: {
      type: DataTypes.JSONB,
    },

    issuedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Store hashed — never the raw refresh token — same principle as passwords.
    refreshTokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('active', 'revoked'),
      allowNull: false,
      defaultValue: 'active',
    },

    revokedAt: {
      type: DataTypes.DATE,
    },
    // Distinguishes routine logout from a takeover/kick or an ops override —
    // this is what LoginHistory and SecurityEvent read to explain "why did this end".
    revokedReason: {
      type: DataTypes.ENUM(
        'logout',
        'kicked_by_new_login',
        'force_reset_by_ops',
        'expired'
      ),
    },
  },
  {
    tableName: 'sessions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['kitchen_user_id'] },
      { fields: ['kitchen_user_id', 'status'] }, // fast lookup of the current active session
      { fields: ['device_id'] },
    ],
  }
)

// NOTE: "only one active session per kitchen user" is enforced at the service layer
// (check-then-revoke-then-create, wrapped in a transaction), not as a DB constraint —
// Postgres partial unique indexes could enforce it too, but the confirm/kick/notify
// flow needs application logic regardless, so the check lives there.

Session.associate = (models) => {
  Session.belongsTo(models.KitchenUser, { foreignKey: 'kitchenUserId', as: 'kitchenUser' })
  Session.hasOne(models.LoginHistory, { foreignKey: 'sessionId', as: 'loginEvent' })
}

export default Session