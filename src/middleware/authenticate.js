
import { UnauthorizedError } from "./ErrorHandler.js";
import { verifyAccessToken } from "../utils/token.js";
import { User } from "../modules/auth/Models/user.js";


export const authenticate = async(req,res,next)=>{
    const authHeader = req.headers.authorization;

    if(!authHeader?.startsWith("Bearer ")){
        throw UnauthorizedError("Access Token is required");

    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user=await User.findByPk(decoded.id);
    if(!user) throw UnauthorizedError("User not found");
    // ADD LATER
    // if(!user.isAcitve) throw UnauthorizedError("Account deactivated");

    req.user=user;

    next();
}

// ── Role guard ────────────────────────────────────────────────────
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw ForbiddenError("You do not have permission to perform this action");
  }
  next();
};