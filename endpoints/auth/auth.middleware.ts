import bcrypt from "bcryptjs";
import { type Request, type Response, type NextFunction } from "express";
import { response } from "../../utils/req-res.js";
import prisma from "../../prisma/client.js";

export async function verifyToken(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return response({ msg: "Authorization required", code: 401, res, success: false });

    const composite = (header.split(" ")[1] ?? "");
    const parts = composite.split("|");
    if (parts.length !== 2) {
      return response({ msg: "Invalid token", code: 401, res, success: false });
    }
    const [tokenId, raw] = parts as [string, string];

    const t = await prisma.token.findUnique({ where: { id: tokenId } });
    if (!t || !t.tokenHash) {
      return response({ msg: "Invalid token", code: 401, res, success: false });
    }

    const ok = await bcrypt.compare(raw, t.tokenHash);
    if (!ok) {
      return response({ msg: "Invalid token", code: 401, res, success: false });
    }

    const user = await prisma.user.findUnique({ where: { id: t.userId } });
    if (!user) {
      return response({ msg: "Invalid token", code: 401, res, success: false });
    }

    await prisma.token.update({ where: { id: t.id }, data: { lastUsedAt: new Date() } });
    (req as any).user = user;
    return next();
  } catch (err) {
    return response({ msg: "Invalid token", code: 401, res, success: false });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
