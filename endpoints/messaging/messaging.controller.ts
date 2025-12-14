import type { Request, Response } from "express";
import { response } from "../../utils/req-res.js";
import MessagingService from "./messaging.services.js";

export default class MessagingController {

    static async sendMessage(req: Request, res: Response) {
        try {
            const { toUserId, listingId, content } = req.body;

            const message = await MessagingService.sendMessage(req as Request & { userId: string }, {
                toUserId,
                listingId,
                content
            });

            return response({
                success: true,
                msg: "Message sent",
                data: { message },
                res,
                code: 201
            });

        } catch (err: any) {
            return response({
                success: false,
                msg: err.message,
                res,
                code: 400
            });
        }
    }

    static async getMessages(req: Request, res: Response) {
        try {
            const recipientId = req.params.recipientId as string;

            const messages = await MessagingService.getMessages(req as Request & { userId: string }, recipientId);

            return response({
                success: true,
                data: { messages },
                res,
                code: 201,
                msg: 'Got messages'
            });

        } catch (err: any) {
            return response({
                success: false,
                msg: err.message,
                res,
                code: 400
            });
        }
    }
}
