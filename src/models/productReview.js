// src/models/ProductReview.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const ProductReview = sequelize.define(
  'ProductReview',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },


  
    order_item_id: { 
        type: DataTypes.UUID,
         allowNull: false,
          unique: true 
        },
    product_id:
     { type: DataTypes.UUID,
         allowNull: false
         },
    user_id: 
    {
         type: DataTypes.UUID,
          allowNull: false
         },
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
      { fields: ['product_id'] },
      { fields: ['user_id'] },
  
    ],
  }
)

ProductReview.associate = (models) => {
    ProductReview.belongsTo(models.OrderItem, { foreignKey: 'order_item_id' });
    ProductReview.belongsTo(models.Product, { foreignKey: 'product_id' });
    ProductReview.belongsTo(models.User, { foreignKey: 'user_id' });

}

export default ProductReview