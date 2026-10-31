// src/models/CashDeposit.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const CashDeposit = sequelize.define(
  'CashDeposit',
  {
    id: { 
        type: DataTypes.UUID,
         defaultValue: DataTypes.UUIDV4,
          primaryKey: true
         },
    driverId: {
         type: DataTypes.UUID,
          allowNull: false 
        },
    kitchenId: {
         type: DataTypes.UUID,
          allowNull: false
         },
    amount: {
         type: DataTypes.DECIMAL(12, 2),
          allowNull: false
         },
    
         receivedBy: DataTypes.UUID,
    
         note: DataTypes.TEXT,
    
         depositedAt: { 
            type: DataTypes.DATE,
             allowNull: false,
              defaultValue: DataTypes.NOW
             },
  },
  { 
    tableName: 'cash_deposits',
     timestamps: true,
      underscored: true,
       indexes: [{ fields: ['driver_id', 'deposited_at'] 

       }]
     }
)

CashDeposit.associate = (models) => {
  CashDeposit.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' })
  CashDeposit.belongsTo(models.Kitchen, { foreignKey: 'kitchenId', as: 'kitchen' })
  CashDeposit.hasMany(models.Delivery, { foreignKey: 'cashDepositId', as: 'deliveries' })
}

export default CashDeposit