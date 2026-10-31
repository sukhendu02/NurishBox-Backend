import { BadRequestError } from "../../../middleware/ErrorHandler.js";

import { sendOtptoDriverService,verifyDriverOtpService,toggleDriverStatusServer,logoutDriverService } from "../server/driverAuth.service.js";


export const sendOtptoDriver= async(req,res)=>{
    const { mobile } = req.body;
    if(!mobile){
        throw BadRequestError("Mobile no. is required");
    }
    // verify 10 digit indian mobile no.
    if(!/^\d{10}$/.test(mobile)){
        throw BadRequestError("Invalid mobile no.");
    }
    if(mobile.startsWith("0")){
        mobile = mobile.slice(1);
    }
    if(mobile.length !== 10){
        throw BadRequestError("Invalid mobile no.");
    }
    console.log(mobile);
   

    const result = await sendOtptoDriverService(mobile);
    res.status(200).json({
        success:true,
        message:result.message,
        result

    })
    

}

export const verifyDriverOtp= async(req,res)=>{
    
    const result = await verifyDriverOtpService(req.body);
    res.status(200).json({
        success:true,
        message:"Login success",
        result
    })

}

export const getDriverProfile = async(req,res)=>{
  
}

export const toggleStatus = async(req,res)=>{
  const result = await toggleDriverStatusServer(req.driver.id,req.body.isOnline);

  res.status(200).json({
    success:true,
    ...result
  })
}


// POST /logout
export const driverLogout = async (req, res) => {
   
      const result = await logoutDriverService(req.driver.id)
      res.status(200).json({ success: true, ...result })
   
  }