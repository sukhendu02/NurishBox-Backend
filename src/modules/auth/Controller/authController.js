
import { NotFoundError,BadRequestError } from "../../../middleware/ErrorHandler.js";
import {  otpService,verifyOTPService } from "../Service/authService.js";


export const sendOTP = async(req,res)=>{

    const { phone } = req.body;
    if(!phone){
        return res.status(400).json({ message: "Phone number is required to send OTP" });
    }
  const result = await otpService(phone);
    res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    data:    result,
  });
}

export const verifyOTP = async(req,res)=>{
  const {phone,otp} = req.body;
  if(!phone || !otp){
    throw BadRequestError("Phone number and OTP are required for verification");
  }
  const result = await verifyOTPService(phone,otp);
  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data:    result,
  });


}

