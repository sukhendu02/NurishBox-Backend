// src/models/Kitchen.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Kitchen = sequelize.define(
  'Kitchen',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Basic Info ────────────────────────────────────────────────
    name: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    contactPhone: {
      type:      DataTypes.STRING,
      allowNull: true,
    },

    // ── Address ───────────────────────────────────────────────────
    line1: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    line2: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    pincode: {
      type:      DataTypes.STRING(10),
      allowNull: false,
    },

    // ── Coordinates ───────────────────────────────────────────────
    latitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },

    // ── Delivery radius ───────────────────────────────────────────
    radiusKm: {
      type:         DataTypes.DECIMAL(5, 2),
      allowNull:    false,
      defaultValue: 12.00,
      comment:      'Delivery radius in kilometers',
    },

    // ── Operating Hours ───────────────────────────────────────────
    openTime: {
      type:      DataTypes.TIME,
      allowNull: false,
      comment:   'Daily opening time e.g. 08:00:00',
    },
    closeTime: {
      type:      DataTypes.TIME,
      allowNull: false,
      comment:   'Daily closing time e.g. 22:00:00',
    },
    timezone: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: 'Asia/Kolkata',
      comment:      'IANA timezone for this kitchen',
    },

    // ── Status ────────────────────────────────────────────────────
    isActive: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull:    false,
      comment:      'Kitchen exists and is operational',
    },

    // ── Order switch ──────────────────────────────────────────────
    acceptingOrders: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull:    false,
      comment:      'Admin can toggle off to pause orders',
    },
  },
  {
    tableName:   'kitchens',
    timestamps:  true,
    underscored: true,
    indexes: [
      { fields: ['is_active'] },
      { fields: ['accepting_orders'] },
      { fields: ['city'] },
    ],
  }
)

Kitchen.associate = (models) => {
  Kitchen.hasMany(models.KitchenInventory, {
    foreignKey: 'kitchenId',
    as:         'inventory',
  })

  Kitchen.hasMany(models.Address, {
    foreignKey: 'kitchenId',
    as:         'addresses',
  })
}

export default Kitchen