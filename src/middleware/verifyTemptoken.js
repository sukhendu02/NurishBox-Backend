
import { UnauthorizedError,ForbiddenError } from "./ErrorHandler.js";
import jwt from "jsonwebtoken";

export const verifyTempToken = (req,res,next)=>{
      const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw UnauthorizedError("Temp token is required");
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

  if (decoded.purpose !== "onboarding") {
    throw ForbiddenError("Invalid token for this action");
  }

  req.phone = decoded.phone; // attach phone to request
  next();
}