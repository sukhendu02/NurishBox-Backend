import { Transaction } from "sequelize"
import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js"
import Address from "../../../models/address.js"
import { User } from "../../auth/Models/user.js"

import {sequelize} from "../../../Config/database.js"
import Order from "../../../models/order.js"
import OrderItem from "../../../models/orderItem.js"
import Payment from "../../../models/payment.js"
import {assignKitchentoAddress} from "../../../utils/kitchen/assignKitchen.js"

export const getUserProfileServcie = async(userId)=>{
    const userProfile  = await User.findByPk(userId,
        {
            attributes:[
                'id',
                'name',
                'email',
                'phone',
                'createdAt',
            ]
        }
    )
        if(!userProfile){
            throw NotFoundError("User")
        }
        return userProfile;
}

export const updateUserProfileService = async (userId,{name,email})=>{
  console.log("Updating user profile for userId:", userId, "with data:", { name, email }); 
  if(!name && !email){
        throw BadRequestError("Provide at least one field to update");
    }

     if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw BadRequestError('Name must be at least 2 characters')
    }
  }
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw BadRequestError('Invalid email address')
    }
 
    // Check uniqueness — exclude current user
    const existingUser = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    })
    if (existingUser && existingUser.id !== userId) {
      throw BadRequestError('Email is already in use')
    }
  }

  const updateUser = await User.findByPk(userId);
  if(!updateUser) throw NotFoundError("User")

    await updateUser.update({
           ...(name  && { name:  name.trim() }),
    ...(email && { email: email.trim().toLowerCase() }),
    })
    return {
        id:updateUser.id,
        name:updateUser.name,
        email:updateUser.email,
    }
}

// ADD NEW ADDRESSS
export const createUserAddressService = async (userId, addressData) => {
    validateAddressData(addressData);
    console.log("addresss is verified")


    // COUNT ADDRESS
    const addressCount = await Address.count({ where: { userId } })
    if(addressCount>=20){
      throw BadRequestError("Address limit reached. You can only have up to 20 addresses.")
    }

    const isFirstAddress = addressCount === 0;
    const shouldBeDefault = isFirstAddress || addressData.isDefault === true
    
    
    // IF NEW ADDRESS IS DEFAULT, UNSET PREVIOUS DEFAULT
    return sequelize.transaction(async (t) => {

      // Remove existing default if setting new one
      if (shouldBeDefault) {
        await Address.update(
          { isDefault: false },
          { where: { userId }, transaction: t }
        )
      }

      
      const newAddress = await Address.create({
        userId,
        label: addressData.label,
        customLabel: addressData.label === 'OTHER' ? addressData.customLabel : null,
        line1: addressData.line1.trim(),
    line2: addressData.line2?.trim() || null,
    landmark: addressData.landmark?.trim() || null,
    city: addressData.city.trim(),
    state: addressData.state.trim(),
    pincode: addressData.pincode.trim(),
    country: addressData.country?.trim() || 'India',
    latitude: addressData.latitude || null,
    longitude: addressData.longitude || null,
    isDefault: shouldBeDefault,
    
    receiversName: addressData.receiversName?.trim(),
    receiversPhone: addressData.receiversPhone?.trim() ,
    
  },
  { transaction: t }
)


await assignKitchentoAddress(newAddress.id,newAddress.latitude,newAddress.longitude,t)



return newAddress;
})
 
}

// GET ALL THE ADDRESS OF THE USER
export const getUserAllAddressesService = async(userId)=>{

    const allAddresses = await Address.findAll({
        where:   { userId },
    order:   [
      ['isDefault', 'DESC'], // default first
      ['createdAt', 'DESC'],
    ],
    attributes: [
      'id', 'label', 'customLabel',
      'receiversPhone', 'receiversName',
      'line1', 'line2', 'landmark',
      'city', 'state', 'pincode', 'country',
      'latitude', 'longitude',
      'isDefault', 'createdAt','kitchenId'
    ],
    })
    

    return{
      allAddresses,
      count:allAddresses.length
    }
}

// GET THE ADDRESS (SINGLE USING ID)
export const getSingleAddressService = async(userId,addressId)=>{
    const address = await Address.findOne({
        where: { userId, id: addressId },
        attributes: [
      'id', 'label', 'customLabel',
      'receiversName', 'receiversPhone',
        'line1', 'line2', 'landmark',
        'city', 'state', 'pincode', 'country',
        'latitude', 'longitude',
        'isDefault', 'createdAt','kitchenId'
    ],
    })
    if(!address){
        throw NotFoundError("Address")
    }
    return address;
}

// UPDATE THE USER ADDRESS USING PATCH
export const updateUserAddressService = async(userId, addressId, updatedData)=>{
  if(!updatedData){
    throw BadRequestError("Please provide at least one data to update")
  }
  
    const address = await Address.findOne({
        where: { userId, id: addressId },
    })
    if(!address){
        throw NotFoundError("Address")
    }

    
     
   const updates = {}

   if (updatedData.label !== undefined) {
    if (!['HOME', 'WORK','FRIENDS & FAMILY' , 'OTHER'].includes(updatedData.label)) {
      throw BadRequestError('Label must be HOME, WORK, FRIENDS & FAMILY, or OTHER')
    }
    updates.label       = updatedData.label
    updates.customLabel = updatedData.label === 'OTHER' ? updatedData.customLabel : null
  }
  if (updatedData.receiversName     !== undefined){
      if (updatedData.receiversName && updatedData.receiversName.trim().length < 2) {
    throw BadRequestError('Receiver name must be at least 2 characters')
    }

    updates.receiversName     = updatedData.receiversName.trim()
  }
  if (updatedData.receiversPhone     !== undefined){
    // check if reveivers phone is valid
  if (updatedData.receiversPhone && !/^\d{10}$/.test(updatedData.receiversPhone.trim())) {
    throw BadRequestError('Phone must be 10 digits')
  }
  updates.receiversPhone     = updatedData.receiversPhone.trim()
  }
    
    if (updatedData.line1     !== undefined) updates.line1     = updatedData.line1.trim()
  if (updatedData.line2     !== undefined) updates.line2     = updatedData.line2?.trim() || null
  if (updatedData.landmark  !== undefined) updates.landmark  = updatedData.landmark?.trim() || null
  if (updatedData.city      !== undefined) updates.city      = updatedData.city.trim()
  if (updatedData.state     !== undefined) updates.state     = updatedData.state.trim()
  if (updatedData.pincode   !== undefined){
      if (updatedData.pincode && !/^\d{6}$/.test(updatedData.pincode.trim())) {
    throw BadRequestError('Pincode must be 6 digits')
    updates.pincode   = updatedData.pincode.trim()
  }
  }
  if (updatedData.country   !== undefined) updates.country   = updatedData.country.trim()
  
      if (updatedData.latitude !== undefined && updatedData.latitude !== null) {
    const lat = parseFloat(updatedData.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw BadRequestError('Invalid latitude')
    }
  
  updates.latitude  = updatedData.latitude
 
}
 
  if (updatedData.longitude !== undefined && updatedData.longitude !== null){
  const lng = parseFloat(updatedData.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw BadRequestError('Invalid longitude')
    }
    updates.longitude = updatedData.longitude
  }

  // await address.update(updates)
  // return address;

  return sequelize.transaction(async (t) => {
  await address.update(updates, { transaction: t })

  // Re-run kitchen mapping only if coordinates changed
  const latChanged = updatedData.latitude  !== undefined
  const lngChanged = updatedData.longitude !== undefined

  if (latChanged || lngChanged) {
    const lat = updates.latitude  ?? address.latitude
    const lng = updates.longitude ?? address.longitude

    await assignKitchentoAddress(addressId, lat, lng, t)
  }

  await address.reload({ transaction: t })
  return address
})

}

// DELETE THE USER ADDRESS
export const deleteUserAddressService = async(userId,addressId)=>{
  const address = await Address.findOne({
    where:{userId,id:addressId}
  })

  if(!address){
    throw NotFoundError("Address");
  }

  const isDefault = address.isDefault;
  await address.destroy();

  if(isDefault){
    // If deleted address was default, set another address as default
    const anotherAddress = await Address.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
    })
    if (anotherAddress) {
      await anotherAddress.update({ isDefault: true })
    }
  }
  return {
    message: "Address deleted successfully"
  }


}
export const setDefaultAddressService = async (userId, addressId) => {
  const address = await Address.findOne({ where: { id: addressId, userId } })
  if (!address) throw NotFoundError('Address')
 
  if (address.isDefault) {
    return address 
  }
 
  return sequelize.transaction(async (t) => {
    // Unset all defaults for this user
    await Address.update(
      { isDefault: false },
      { where: { userId }, transaction: t }
    )
 
    // Set new default
    await address.update({ isDefault: true }, { transaction: t })
    return address
  })
}




// -------- ADDRESSS VALIDATION --------
 const validateAddressData = (addressData) => {
    console.log("Validating address data:", addressData);
    const required = ['line1', 'city', 'state', 'pincode']
  const missing  = required.filter((f) => !addressData[f]?.trim())
 
  if (missing.length) {
    throw BadRequestError(`Missing required fields: ${missing.join(', ')}`)
  }
 
  if (addressData.pincode && !/^\d{6}$/.test(addressData.pincode.trim())) {
    throw BadRequestError('Pincode must be 6 digits')
  }

  if (addressData.label && !['HOME', 'WORK', 'FRIENDS & FAMILY', 'OTHER'].includes(addressData.label)) {
    throw BadRequestError('Address type must be HOME, WORK, FRIENDS & FAMILY, or OTHER')
  }
  if (addressData.label === 'OTHER' && !addressData.customLabel?.trim()) {
    throw BadRequestError('Address type is required.')
  }

   if (addressData.latitude !== undefined && addressData.latitude !== null) {
    const lat = parseFloat(addressData.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw BadRequestError('Invalid latitude')
    }
  }
 
  if (addressData.longitude !== undefined && addressData.longitude !== null) {
    const lng = parseFloat(addressData.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw BadRequestError('Invalid longitude')
    }
  }



// check if receiver phone and name are provided together
 if(!addressData.receiversName || !addressData.receiversPhone){
    throw BadRequestError('Receiver name and phone must be provided.')
 }
 
// check if reveivers phone is valid
  if (addressData.receiversPhone && !/^\d{10}$/.test(addressData.receiversPhone.trim())) {
    throw BadRequestError('Phone must be 10 digits')
  }
//   chekk if receiver name is at least 2 characters
    if (addressData.receiversName && addressData.receiversName.trim().length < 2) {
    throw BadRequestError('Receiver name must be at least 2 characters')
    }
}


// ORDERS

export const getmyOrderService = async(userId,query={})=>{
  const { page=1,limit=10} = query;

    const parsedPage = parseInt(page,10);
    const parsedLimit= parseInt(limit,10);

    const offset = (parsedPage-1)*parsedLimit;
  const {count,rows} = await Order.findAndCountAll({
    where:{userId},
    order: [['createdAt', 'DESC']],
    limit:parsedLimit,
    offset,
     include: [
    {
      model: OrderItem,
      as: 'items',
      attributes: [
        'id', 'productId', 'productName', 'productImage',
        'productCategory', 'quantity', 'unitPrice', 'totalPrice',
      ],
    },
    {
      model: Payment,
      as: 'payment',
      attributes: [
        'id', 'method', 'status', 'amount', 'currency',
        'razorpayOrderId', 'razorpayPaymentId', 'paidAt',
        'failureMessage', 'refundId', 'refundAmt', 'refundedAt',
      ],
    },
    {
      model: Address,
      as: 'address',
      attributes: [
        'label', 'line1', 'line2', 'landmark',
        'city', 'state', 'pincode', 'country',
      ],
    },
  ],
  distinct: true,
  });
  return{
    rows,
    total:count,
    pagination:{
      page:parsedPage,
      limit:parsedLimit,
       totalPage : Math.ceil(count/parsedLimit),
        hasNext:parsedPage<Math.ceil(count/parsedLimit),
        hasPrev : parsedPage>1,
    }


  }
  
}