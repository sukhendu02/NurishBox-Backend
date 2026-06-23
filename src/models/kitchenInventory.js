// src/models/KitchenInventory.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const KitchenInventory = sequelize.define(
  'KitchenInventory',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Foreign Keys ──────────────────────────────────────────────
    kitchenId: {
      type:      DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'kitchens',
        key:   'id',
      },
      onDelete: 'CASCADE',
    },
    productId: {
      type:      DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key:   'id',
      },
      onDelete: 'CASCADE',
    },

    // ── Stock ─────────────────────────────────────────────────────
    quantity: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    // ── Manual override ───────────────────────────────────────────
    // Even if quantity > 0, admin can mark unavailable (e.g. item prep issue)
    isAvailable: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull:    false,
    },
  },
  {
    tableName:   'kitchen_inventory',
    timestamps:  true,
    underscored: true,
    indexes: [
      // Most common query: give me all available products for kitchen X
      { fields: ['kitchen_id', 'is_available'] },
      { fields: ['kitchen_id', 'product_id'], unique: true }, // one row per kitchen+product
      { fields: ['product_id'] },
    ],
  }
)

KitchenInventory.associate = (models) => {
  KitchenInventory.belongsTo(models.Kitchen, {
    foreignKey: 'kitchenId',
    as:         'kitchen',
  })

  KitchenInventory.belongsTo(models.Product, {
    foreignKey: 'productId',
    as:         'product',
  })
}

export default KitchenInventory