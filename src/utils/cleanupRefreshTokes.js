// src/utils/cleanupTokens.js
import { Op } from "sequelize";
import RefreshToken from "../modules/auth/Models/refreshTokenModel.js";
export const cleanupExpiredTokens = async () => {
  const deleted = await RefreshToken.destroy({
    where: {
      [Op.or]: [
        { expiresAt:  { [Op.lt]: new Date() } }, // expired
        { isRevoked:  true,                       // revoked older than 1 day
          updatedAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  console.log(`🧹 Cleaned up ${deleted} old refresh tokens`);
};