
import bcrypt from "bcrypt";
import {OTP} from "../Models/otp.js";
import {BadRequestError, NotFoundError} from "../../../middleware/ErrorHandler.js";
import e from "express";


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


export const verifyOTPService = async(phone,otp)=>{
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


    return {message: "OTP verified successfully"};

}