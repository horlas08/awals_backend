import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        blocked: boolean;
    };
}

/**
 * Verifies JWT from Authorization header.
 * Throws 401 if token is missing / invalid.
 * Throws 403 if the authenticated user is blocked.
 */
export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized: token missing' });
        }

        let decoded: any;

        try {
            decoded = jwt.verify(token, JWT_SECRET as string) as any;
        } catch {
            return res.status(401).json({ success: false, message: 'Unauthorized: token expired or invalid' });
        }

        // Fetch user from DB to get latest blocked status
        const user = await prisma.user.findUnique({
            where: { id: decoded.id ?? decoded.userId ?? decoded.sub },
            select: { id: true, role: true, blocked: true } as any
        }) as any;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
        }

        if (user.blocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
        }

        req.user = user;
        return next();
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin-only middleware — must be used AFTER authMiddleware.
 */
export const adminMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
    }
    return next();
};
