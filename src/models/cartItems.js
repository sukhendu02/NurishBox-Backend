// src/models/CartItem.js
import { DataTypes } from "sequelize";
import { sequelize } from "../Config/database.js";

const CartItem = sequelize.define("CartItem", {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  cartId: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 1,
    validate:     { min: 1, max: 20 },
  },
}, {
  tableName:   "cart_items",
  timestamps:  true,
  underscored: true,
  indexes: [
    { fields: ["cart_id"] },
    { fields: ["product_id"] },
    { unique: true, fields: ["cart_id", "product_id"] }, // no duplicate products
  ],
});

CartItem.associate = (models) => {
  CartItem.belongsTo(models.Cart, { foreignKey: "cartId",  as: "cart" });
  CartItem.belongsTo(models.Product, { foreignKey: "productId",  as: "product" });
};

export default CartItem;