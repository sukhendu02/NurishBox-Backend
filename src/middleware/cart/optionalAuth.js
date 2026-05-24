// src/middleware/optionalAuth.js
// Attaches user if token present — but doesn't block if not
import { verifyAccessToken } from "../../utils/token.js";
import {User}         from "../../modules/auth/Models/user.js";
import RefreshToken from "../../modules/auth/Models/refreshTokenModel.js";

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return next();

    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
       if (!decoded?.id) {
      return next();
    }
    // const session = await RefreshToken.findOne({
    //   where: { id: decoded.sessionId, userId: decoded.id, isRevoked: false },
    // });
    // if (!session) return next();

    const user = await User.findByPk(decoded.id);
    if (user) req.user = user;

  } catch (err) {
    // Token invalid — just continue as guest
  }
  next();
};