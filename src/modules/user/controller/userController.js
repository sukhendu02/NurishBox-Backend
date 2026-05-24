
import { getUserProfileServcie, updateUserProfileService,createUserAddressService,getUserAllAddressesService,getSingleAddressService,updateUserAddressService,deleteUserAddressService,setDefaultAddressService} from "../service/userService.js";
export const getUserProfile = async (req, res) => {

    const userId = req.user.id;
    // Fetch user profile from database using userId
    const userProfile= await getUserProfileServcie(userId);
    res.status(200).json({
        success: true,
        data: userProfile,
    })
}

export const updateUserProfile = async(req,res)=>{
    
    const userId = req.user.id;
    const {name,email} = req.body;
    console.log("Received update request for userId:", userId, "with data:", { name, email });
    const updatedProfile = await updateUserProfileService(userId,{name,email});
    res.status(200).json({
        success: true,
        data: updatedProfile,
    })

}

export const getUserAllAddresses = async(req,res)=>{
    const userId= req.user.id;
    // Fetch user addresses from database using userId
    const allAddresses = await getUserAllAddressesService(userId);
    res.status(200).json({
        success: true,
        data: allAddresses,
    });
}
export const createUserAddress = async(req,res)=>{
  
    const userId= req.user.id;
    const addressData = req.body;
    const newAddress = await createUserAddressService(userId,addressData);
    res.status(200).json({
        success: true,
        data: newAddress,
    });
}

export const getSingleAddress = async(req,res)=>{
    const userId= req.user.id;
    const {addressId} = req.params;
    const address = await getSingleAddressService(userId,addressId);
    res.status(200).json({
        success: true,
        data: address,
    });
}
export const updateUserAddress = async(req,res)=>{
    const userId= req.user.id;
    const {addressId} = req.params;
    const updatedData = req.body;
    const updatedAddress = await updateUserAddressService(userId, addressId, updatedData);
    res.status(200).json({
        success: true,
        data: updatedAddress,
    });
}
export const deleteUserAddress = async(req,res)=>{
    const userId= req.user.id;
    const {addressId} = req.params;
    // Fetch user addresses from database using userId
    const deletedAddress = await deleteUserAddressService(userId, addressId);
    res.status(200).json({
        success: true,
        message:deleteUserAddress ? "Address deleted successfully" : "Address not found or already deleted",
    });
}

export const setDefaultAddress = async(req,res)=>{
      const {addressId} = req.params;
    const data = await setDefaultAddressService(req.user.id,addressId)
    res.status(200).json({
        success:true,
        message:"Address set to default",
        data

    })
}


