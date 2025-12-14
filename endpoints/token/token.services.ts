import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh123";
const REFRESH_EXPIRES_IN_DAYS = 7;

export class RefreshTokenService {

  // -------------------------------------------------------------------
  // CREATE REFRESH TOKEN
  // -------------------------------------------------------------------
  static async create(userId: string) {
    const token = jwt.sign(
      { id: userId },
      JWT_REFRESH_SECRET,
      { expiresIn: `${REFRESH_EXPIRES_IN_DAYS}d` }
    );

    // Store token hash in the DB (schema uses tokenHash)
    await prisma.token.create({
      data: {
        userId,
        tokenHash: token,
      }
    });

    return token;
  }

  // -------------------------------------------------------------------
  // VALIDATE TOKEN
  // -------------------------------------------------------------------
  static async validate(token: string) {

    // Find existing token by tokenHash
    const existing = await prisma.token.findFirst({ where: { tokenHash: token } });
    if (!existing) throw new Error("Refresh token not found");

    // Rely on JWT expiry for token expiration check
    const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    return { payload, existing };
  }

  // -------------------------------------------------------------------
  // REVOKE (DELETE) A TOKEN
  // -------------------------------------------------------------------
  static async revoke(token: string) {
    await prisma.token.deleteMany({ where: { tokenHash: token } });
  }

  // -------------------------------------------------------------------
  // REVOKE ALL TOKENS FOR A USER
  // -------------------------------------------------------------------
  static async revokeAll(userId: string) {
    await prisma.token.deleteMany({
      where: { userId }
    });
  }

  // -------------------------------------------------------------------
  // ROTATE REFRESH TOKEN (DELETE OLD, CREATE NEW)
  // -------------------------------------------------------------------
  static async rotate(token: string) {
    const { payload, existing } = await this.validate(token);

    // Delete old token
    await prisma.token.delete({
      where: { id: existing.id }
    });

    // NOTE: payload.id is correct here
    const newToken = await this.create((payload as any).id);

    return newToken;
  }

  // -------------------------------------------------------------------
  // GET ALL TOKENS FOR A USER (ADMIN/DEBUG)
  // -------------------------------------------------------------------
  static async getUserTokens(userId: string) {
    return prisma.token.findMany({
      where: { userId }
    });
  }
}
