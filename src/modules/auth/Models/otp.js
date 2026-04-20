import { DataTypes } from "sequelize";
import { sequelize } from "../../../Config/database.js";

export const OTP = sequelize.define(
  "OTP",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
   

      isUsed: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isBlocked: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },

    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "otp_codes",
    timestamps: true,
    underscored: true,
  }
);