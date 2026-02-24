import { response } from "../../utils/req-res.js";
import type { Response } from "express";
import prisma from "../../prisma/client.js";
import bcrypt from "bcryptjs";

export class UserService {

    // ------------------------------------------------------------
    // CREATE USER
    // ------------------------------------------------------------

    // ------------------------------------------------------------
    // GET USER BY ID
    // ------------------------------------------------------------
    static async getUserById(res: Response, id: string) {
        const user = await prisma.user.findUnique({
            where: { id: String(id) }
        });

        if (!user) return response({
            res,
            msg: "User not found!",
            code: 404,
            success: false
        });

        return response({
            res,
            msg: "Got user profile",
            code: 200,
            success: true,
            data: { user }
        });
    }

    // ------------------------------------------------------------
    // GET USER BY EMAIL
    // ------------------------------------------------------------
    static async getUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }

    // ------------------------------------------------------------
    // UPDATE USER
    // ------------------------------------------------------------
    static async updateUser(res: Response, id: string, data: any) {
        if (data.password) {
            data.passwordHash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }

        const updated = await prisma.user.updateMany({
            where: { id: String(id) },
            data
        });

        if (updated.count === 0) {
            return response({
                msg: "User not found",
                res,
                code: 404,
                success: false
            });
        }

        const updatedUser = await prisma.user.findUnique({
            where: { id: String(id) }
        });

        return response({
            msg: `Your profile was ${updatedUser?.deleted ? "deleted" : "updated"}`,
            res,
            code: 201,
            success: true,
            data: { user: updatedUser }
        });
    }

    // ------------------------------------------------------------
    // DELETE USER
    // ------------------------------------------------------------
    static async deleteUser(id: string) {
        const userId = String(id);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return;
        }

        await prisma.$transaction([
            prisma.token.deleteMany({ where: { userId } }),
            prisma.review.deleteMany({ where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] } }),
            prisma.message.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } }),
            prisma.wishlistItem.deleteMany({ where: { userId } }),
            prisma.wishlistCategory.deleteMany({ where: { userId } }),
            prisma.booking.deleteMany({ where: { guestId: userId } }),
            prisma.listing.deleteMany({ where: { hostId: userId } }),
            prisma.serviceListing.deleteMany({ where: { hostId: userId } }),
            prisma.experienceListing.deleteMany({ where: { hostId: userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        return true;
    }

    // ------------------------------------------------------------
    // GET ALL USERS
    // ------------------------------------------------------------
    static async getAllUsers() {
        return prisma.user.findMany();
    }
}
