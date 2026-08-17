// src/models/Address.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const Address = sequelize.define(
  'Address',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    userId: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    
    receiversName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    receiversPhone: {
      type: DataTypes.STRING,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },

    // ── Label ─────────────────────────────────────────────────────
    label: {
      type:         DataTypes.ENUM('HOME', 'WORK','FRIENDS & FAMILY' ,'OTHER'),
      defaultValue: 'HOME',
      allowNull:    false,
    },
    customLabel: {
      type:      DataTypes.STRING(50),
      allowNull: true, // only filled when label = OTHER
    },

    // ── Address Lines ─────────────────────────────────────────────
    line1: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    line2: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    landmark: {
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
    country: {
      type:         DataTypes.STRING,
      defaultValue: 'India',
      allowNull:    false,
    },

    // ── Coordinates ───────────────────────────────────────────────
    latitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },

    // ── Default flag ──────────────────────────────────────────────
    isDefault: {
      type:         DataTypes.BOOLEAN,
      defaultValue: false,
    },

      // ── Kitchen mapping ───────────────────────────────────────────
    kitchenId: {
      type:      DataTypes.UUID,
      allowNull: true, // null until mapped after creation
      references: {
        model: 'kitchens',
        key:   'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', 
      // if kitchen is deleted, don't lose the address
    },
  },
  {
    tableName:   'addresses',
    timestamps:  true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'is_default'] },
    ],
  }
)

Address.associate = (models) => {
  Address.belongsTo(models.User, {
    foreignKey: 'userId',
    as:         'user',
  })
}

export default Address