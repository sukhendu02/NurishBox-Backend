// src/models/RefreshToken.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../../Config/database.js";

const RefreshToken = sequelize.define("RefreshToken", {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  userId: {
    type:      DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type:      DataTypes.TEXT,
    allowNull: false,
    unique:    true,
  },
  expiresAt: {
    type:      DataTypes.DATE,
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING,
  },
  userAgent: {
    type: DataTypes.STRING,
  },
  isRevoked: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName:   "refresh_tokens",
  timestamps:  true,
  underscored: true,
});

export default RefreshToken;