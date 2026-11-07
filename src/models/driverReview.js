// src/models/DriverReview.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const DriverReview = sequelize.define(
  'DriverReview',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },


    delivery_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    driver_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    rating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 5, isInt: true },
    },
    review: { type: DataTypes.TEXT, allowNull: true },
  },

  
  

  {
    tableName: 'product_review',
    timestamps: true,
    underscored: true,

    indexes: [
      { fields: ['rating'] },
      { fields: ['driver_id'] },
      { fields: ['user_id'] },
  
    ],
  }
)

DriverReview.associate = (models) => {
    DriverReview.belongsTo(models.Delivery, { foreignKey: 'delivery_id' });
    DriverReview.belongsTo(models.Driver, { foreignKey: 'driver_id' });
    DriverReview.belongsTo(models.User, { foreignKey: 'user_id' });

}

export default DriverReview