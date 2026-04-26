// src/utils/token.js
import jwt from "jsonwebtoken";
import RefreshToken from "../modules/auth/Models/refreshTokenModel.js";
import { UnauthorizedError } from "../middleware/ErrorHandler.js";


// ACCESS TOKEN 
export const generateAccessToken= (user) => {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
};

// Short-lived temp token — only used to call /REGISTER-USER and complete profile
export const generateTempToken = (phone) => {
  return jwt.sign(
    { phone, purpose: "onboarding" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "10m" } // expires in 10 mins
  );
};

export const generateRefreshToken = async (userId,{ipAddress, userAgent}={})=>{

  // const token = crypto.randomBytes(64).toString("hex");
  const token = crypto.randomUUID(64).toString("hex")
  const expiresAt = new Date(Date.now()+7*24*60*60*1000); // 7 days

  await RefreshToken.create(
    {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    }
  )
  return token;
}


// VERIFY ACCESS TOKEN
export const verifyAccessToken=(token)=>{
  try {
    return jwt.verify(token,process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if(error.name==="TokenExpiredError") throw UnauthorizedError("Access token expired");
    throw UnauthorizedError("Invalid access Token");
  }
}


// ROTATE REFRESH TOKEN 
export const rotateRefreshToken = async (oldToken,{ipAddress,userAgent}={})=>{
  const existing = await RefreshToken.findOne({
    where:{token:oldToken},
  })
  if(!existing) throw UnauthorizedError("Invalid refresh token");
  if(existing.isRevoked) throw UnauthorizedError("Refresh Token has been revoked");
  if(existing.expiresAt<new Date()) throw UnauthorizedError("Refresh token expired. Please login again");

  await existing.update({isRevoked:true});

  const newToken = await generateRefreshToken(existing.userId,{ipAddress,userAgent});

  return {
    userId: existing.userId,
    newRefreshToken:newToken
  }
}