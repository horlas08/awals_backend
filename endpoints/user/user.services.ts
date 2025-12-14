import { response } from "../../utils/req-res.js";
import type { Response } from "express";
import prisma from "../../prisma/client.js";

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
        const user = await prisma.user.delete({
            where: { id: String(id) }
        });

        if (!user) throw new Error("User not found");

        return user;
    }

    // ------------------------------------------------------------
    // GET ALL USERS
    // ------------------------------------------------------------
    static async getAllUsers() {
        return prisma.user.findMany();
    }
}
