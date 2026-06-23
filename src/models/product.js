// src/models/Meal.js
import { DataTypes } from "sequelize";
import { sequelize } from "../Config/database.js";

const Product = sequelize.define("Product", {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  name: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type:      DataTypes.STRING,
    unique:    true,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },

  type:{
    type:DataTypes.ENUM(
      "VEG",
      "NON-VEG",
    )
  },
  
  // CHECK ENOM OR STRING
  category: {
    type:      DataTypes.ENUM(
      "BREAKFAST", "LUNCH", "DINNER",
  "BOWLS",
  'SALADS',
  'BURGERS',
  'WRAPS',
  'SNACKS',
  'MEAL KITS',
  'BEAVRAGES',
  'DESSERTS',
  'SIDES',

    ),
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },

   // ── Nutrition ─
  caloriesKcal: {
    type: DataTypes.INTEGER,
  },
  proteinG: {
    type: DataTypes.DECIMAL(6, 2),
  },
  carbsG: {
    type: DataTypes.DECIMAL(6, 2),
  },
  fatG: {
    type: DataTypes.DECIMAL(6, 2),
  },
  fibreG: {
    type: DataTypes.DECIMAL(6, 2),
  },

   weight: {
    type: DataTypes.STRING, // "320g", "390g"
  },
   goal: {
    type: DataTypes.STRING, 
  },

 ingredients: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    // ["Avocado", "Lettuce", "Plant Patty", "Seeded Bun"]
  },

   allergens: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    // ["Gluten", "Soy", "Dairy"]
  },

  basePrice: {
    type:      DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountPrice: {
    type: DataTypes.DECIMAL(10, 2),
  },
  isAvailable: {
    type:         DataTypes.BOOLEAN,
    defaultValue: true,
  },
  discontinued:{
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  prepTimeMin: {
    type: DataTypes.INTEGER,
  },
  servingSize: {
    type: DataTypes.STRING,
  },

  isFeatured: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },

   isPopular: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },

    totalOrders: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
    // incremented on every order — used for popularity sorting
  },
  spiceLevel: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName:   "products",
  timestamps:  true,
  underscored: true,
  paranoid:    true, // soft delete
 indexes: [
    { fields: ["category"] },
    { fields: ["is_available"] },
    { fields: ["is_featured"] },
    { fields: ["slug"] },
  ],
});

Product.associate = (models) => {
  Product.hasMany(models.CartItem, { foreignKey: "productId", as: "cartItems" });
    Product.hasMany(models.KitchenInventory, { foreignKey: "productId", as: "inventory" }); 
};

export default Product;