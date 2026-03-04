import { type Request, type Response } from "express";
import { response } from "../../utils/req-res.js";
import { PaymentService } from "./payment.services.js";

export class PaymentController {
    static async getBalances(req: Request & { user?: any }, res: Response) {
        try {
            const balances = await PaymentService.getBalances(req.user.id);
            return response({
                res,
                success: true,
                code: 200,
                msg: "Balances retrieved",
                data: balances,
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 500,
                msg: error.message,
            });
        }
    }

    static async getPayoutDetails(req: Request & { user?: any }, res: Response) {
        try {
            const details = await PaymentService.getPayoutDetails(req.user.id);
            return response({
                res,
                success: true,
                code: 200,
                msg: "Payout details retrieved",
                data: details,
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 500,
                msg: error.message,
            });
        }
    }

    static async updatePayoutDetails(req: Request & { user?: any }, res: Response) {
        try {
            await PaymentService.updatePayoutDetails(req.user.id, req.body);
            return response({
                res,
                success: true,
                code: 200,
                msg: "Payout details updated",
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 500,
                msg: error.message,
            });
        }
    }
}
