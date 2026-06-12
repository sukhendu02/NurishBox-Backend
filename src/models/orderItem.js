
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    orderId: {
      type:      DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type:      DataTypes.UUID,
      allowNull: false,
    },

    // ── Snapshot at time of order ─────────────────────────────────
    // Store these so order history is accurate even if product
    // name or price changes later
    productName: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    productImage: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    productCategory: {
      type:      DataTypes.STRING,
      allowNull: true,
    },

    // ── Pricing ───────────────────────────────────────────────────
    quantity: {
      type:      DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalPrice: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName:   'order_items',
    timestamps:  true,
    underscored: true,
    indexes: [
      { fields: ['order_id'] },
      { fields: ['product_id'] },
    ],
  }
)

OrderItem.associate = (models) => {
  OrderItem.belongsTo(models.Order,   { foreignKey: 'orderId',   as: 'order'   })
  OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' })
}

export default OrderItem