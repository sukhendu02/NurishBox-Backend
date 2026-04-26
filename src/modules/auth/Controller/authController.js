
import { NotFoundError,BadRequestError } from "../../../middleware/ErrorHandler.js";
import {  otpService,refreshTokenService,userRegistrationService,verifyOTPService,logoutService,logoutAllService,verifyEmailService} from "../Service/authService.js";



const getMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});


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
  const meta = {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
  const result = await verifyOTPService(phone,otp,meta);
  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    data:    result,
  });


}

export const registerUser = async(req,res)=>{
  const phone=req.phone;

  const {name,email}=req.body
  const result = await userRegistrationService(phone,{name,email});
  
   res.status(201).json({
    success: true,
    message: "Profile created successfully",
    data:    result,
  });
}

export const getrefreshToken =async(req,res)=>{
  const {refreshToken} = req.body;

  const result = await refreshTokenService(refreshToken,getMeta(req));

  res.status(200).json({
    success:true,
    message:"Token refershed",
    data:result,
  })
}

export const logout = async(req,res)=>{
  const {refreshToken} = req.body;
  const result =await logoutService(refreshToken);
  res.status(200).json({
    success:true,
    ...result
  })
}
export const logoutAll = async(req,res)=>{
  const result = await logoutAllService(req.user.id);
  res.status(200).json({
    success:true,
    ...result
  })
}

export const verifyEmail = async(req,res)=>{
  const getemail = req.user.email
  if(!getemail) throw BadRequestError("Email is required")
  const result = await verifyEmailService(getemail)
res.status(204).json({
  success:true
})
}

export const checkProtected = async (req,res)=>{
  const thisUser = req.user;
  
  res.status(200).json({
    success:true,
    message:"Protected route",
    user:thisUser
  })
}

