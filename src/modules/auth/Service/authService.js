
import bcrypt from "bcrypt";
import {OTP} from "../Models/otp.js";
import {BadRequestError, ConflictError, NotFoundError, UnauthorizedError} from "../../../middleware/ErrorHandler.js";
import e from "express";
import {User} from "../Models/user.js"
import { generateAccessToken,generateRefreshToken,generateTempToken, rotateRefreshToken } from "../../../utils/token.js";
import RefreshToken from "../Models/refreshTokenModel.js";

// GENRATE OTP SERVICE
export const otpService = async(phone)=>{
    // 
    console.log("Received phone number for OTP:", phone);
    if(!phone){
        throw BadRequestError("Phone number is required to send OTP");
    } 
    // Check if phone no. is valid or not
    // ADD MORE VALIDATION FOR PHONE NUMBER IF NEEDED
    if (!/^\d{10}$/.test(phone)) {
        throw BadRequestError("Invalid phone number format");
    }

    // Check if user with this phone number exists in the system
    // For this example, we will assume that any phone number is valid and can receive an OTP
    // In production, you should check against your user database to ensure the phone number is registered

    // Resend otp after 1 minute if user requests again
    const lastOTP = await OTP.findOne({where:{phone},
         order: [["created_at", "DESC"]]
        });

        
    if(lastOTP){
        
        const timeSinceLastOTP =(Date.now() - new Date(lastOTP.createdAt))  / 1000; // in seconds
        console.log(`Time since last OTP for ${phone}: ${timeSinceLastOTP} seconds`);
        if(timeSinceLastOTP < parseInt(process.env.OTP_RESEND_INTERVAL)){
            throw BadRequestError(`Please wait ${Math.ceil(parseInt(process.env.OTP_RESEND_INTERVAL) - timeSinceLastOTP)} seconds before requesting a new OTP`);
        }

    }

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
   
    const otp_hashed = await bcrypt.hash(otp,10);
    // throw NotFoundError("User with this phone number does not exist");
    console.log(`OTP for ${phone}: ${otp} (Hashed: ${otp_hashed})`); // For testing, log the OTP
    
    // Save OTP to DB
    await OTP.destroy({where:{phone}}); // Delete existing OTP for this phone number

    const newOTP =await OTP.create({
        phone,
        otp: otp_hashed,
        expires_at: new Date(Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME_IN_MINS) * 60 * 1000) // OTP expires in 3 minutes
    });

    // sent OTP to user via SMS (mocked here)
    // In production, integrate with an SMS service like Twilio to send the OTP to the user's phone number

    return {message: "OTP sent successfully",otp:otp}; // In production, do NOT return the OTP in the response
  
}

// VERIFY OTP SERVICE
export const verifyOTPService = async(phone,otp,meta)=>{

    
        if(!phone || !otp){
        throw BadRequestError("Phone number and OTP are required for verification");
    }

    const otpRecord = await OTP.findOne({where:{phone},
     order: [["created_at", "DESC"]],
    });
    if(!otpRecord){
        throw NotFoundError("No OTP request found for this phone number");
    }

    if(otpRecord.isUsed){
        throw BadRequestError("Invalid OTP, please request a new one");
    }

    if(otpRecord.isBlocked){
        throw BadRequestError("Too many failed attempts, please request a new OTP");
    }

    if(otpRecord.expires_at < new Date()){
        await OTP.destroy({where:{phone}}); // Delete expired OTP
        throw BadRequestError("OTP has expired, please request a new one");
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if(!isValid){
        otpRecord.attempts += 1;

        if(otpRecord.attempts >= parseInt(process.env.OTP_MAX_ATTEMPTS)){
            otpRecord.isBlocked = true;
        }
        await otpRecord.save();
        throw BadRequestError( 
            otpRecord.isBlocked ? "Max attempts reached. Please request a new OTP.":
           `Invalid OTP! `+ (parseInt(process.env.OTP_MAX_ATTEMPTS) - otpRecord.attempts) + ` attempts remaining.`);
    }
    // OTP is valid

    await otpRecord.update({ isUsed: true });


    // return {message: "OTP verified successfully"};
    return findOrInitUser(phone,meta);

}


// IF USER ALREADY REGISTERED THEN LOGIN OTHERWISE ONBOARDING  PAGE
const findOrInitUser=async(phone,meta)=>{

    const existingUser = await User.findOne({where:{phone}});

    if(existingUser){

        const accessToken = await generateAccessToken(existingUser);
        const refreshToken = await generateRefreshToken(existingUser.id,meta)
        return{

            isNewUser:false,
            accessToken,
            refreshToken,
            user:{
                id:existingUser.id,
                name:existingUser.name,
    
            },
            existingUser
        }

    }

    const tempToken = generateTempToken(phone)
    return{
        isNewUser:true,
        tempToken
    }

}

// USER REGISTRATIOIN
export const userRegistrationService = async(phone,{name,email})=>{


    if(!name||name.trim().length<2){
  throw BadRequestError("Full name is required and must be of at least 2 characters")
}

 // ── 2. Validate email format (optional but if provided must be valid) ──
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw BadRequestError("Invalid email address");
  }

  if(email){
    const emailExists=await User.findOne({where:{email}});
    if(emailExists){
        throw ConflictError("Email already registerd")
    }
  }

  const userExist = await User.findOne({where:{phone}});
  if(userExist){
    // login the user 
    throw BadRequestError("User already Present. Please login.")
  }

  const newUser =await User.create({
    phone,
    name:name.trim(),
    email:email? email.trim().toLowerCase(): null,

    // OPTIONAL
    isVerified:true, // CAN CHANGE TO EMAIL VERIFIED OR NOT
    role:"CUSTOMER",
  })

  return{
    isNewUser:true,
    toDo:"Login_Now"
  }
}




// REFRESH TOKEN SERVICE
export const refreshTokenService = async(refreshToken, meta)=>{

    if(!refreshToken) throw BadRequestError("Refresh Token is required");
    const {userId, newRefreshToken } = await rotateRefreshToken(refreshToken,meta);
    const user = await User.findByPk(userId);
    if(!user) throw UnauthorizedError("User not found");
    if(!user.isActive) throw UnauthorizedError("Account deactivated");
    
    const accessToken = generateAccessToken(user);
    return{
        accessToken,
        refreshToken:newRefreshToken,
    };
};

export const logoutService=async(refreshToken) =>{
    if(!refreshToken) throw BadRequestError("Refresh token is required");

    const existing = await RefreshToken.findOne({where:{token:refreshToken}});
    if(!existing) throw BadRequestError("Invalid refresh token");

    await existing.update({isRevoked:true});
    return{
        message:"Logged out successfully",
    }
}


export const logoutAllService = async (userId)=>{
    await RefreshToken.update(
        {isRevoked:true},
        {where:{userId}}
    );
    return {
        message:"Logged out from all devices"
    }
}

export const verifyEmailService = async (email)=>{
    // verify email using link or otp
    // Not so important we can do this later
}