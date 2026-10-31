// src/models/DriverDocument.js
import { DataTypes } from 'sequelize'
import { sequelize } from '../Config/database.js'

const DriverDocument = sequelize.define(
  'DriverDocument',
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
    docType: {
         type: DataTypes.ENUM('LICENSE', 'RC', 'PAN', 'AADHAAR', 'PHOTO', 'LIVE_PHOTO'),
          allowNull: false
         },

    docNumber: DataTypes.STRING(50),
    
    fileUrl: {
         type: DataTypes.TEXT,
          allowNull: false 
        },
    expiryDate: DataTypes.DATEONLY,
    
    status: { type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'), allowNull: false, defaultValue: 'PENDING' },
    
    remarks: DataTypes.TEXT,
    
    verifiedBy: DataTypes.UUID,
    
    verifiedAt: DataTypes.DATE,
  },
  {
     tableName: 'driver_documents',
      timestamps: true,
       underscored: true,
        indexes: [{ fields: ['driver_id', 'doc_type']

         }]
         }

)

DriverDocument.associate = (models) => {
  DriverDocument.belongsTo(models.Driver, { foreignKey: 'driverId', as: 'driver' })
}

export default DriverDocument