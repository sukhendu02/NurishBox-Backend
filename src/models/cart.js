// src/models/Cart.js
import { DataTypes } from "sequelize";
import { sequelize } from "../Config/database.js";


const Cart = sequelize.define("Cart", {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  // Either userId OR sessionId — never both
  userId: {
    type:      DataTypes.UUID,
    allowNull: true,
  },
  sessionId: {
    type:      DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName:   "carts",
  timestamps:  true,
  underscored: true,
  indexes: [
    { fields: ["user_id"] },
    { fields: ["session_id"] },
  ],
});

Cart.associate = (models) => {
  Cart.belongsTo(models.User,     { foreignKey: "userId",  as: "user" });
  Cart.hasMany(models.CartItem,   { foreignKey: "cartId",  as: "items", onDelete: "CASCADE" });
};

export default Cart;