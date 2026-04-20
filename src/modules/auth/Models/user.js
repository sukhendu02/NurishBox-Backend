import { DataTypes } from "sequelize";
import { sequelize } from "../../../Config/database.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    phone: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },

    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

   dietary_pref: {
  type: DataTypes.ENUM("veg", "non_veg", "vegan"),
  allowNull: true,
},

    fitness_goal: {
      type: DataTypes.ENUM("weight_loss", "muscle_gain", "maintenance", "general_health"),
      allowNull: true,
    },

    default_kitchen_id: {
      type: DataTypes.UUID,
      allowNull: true,
      // FK (we will connect later)
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true, // created_at instead of createdAt
  }
);