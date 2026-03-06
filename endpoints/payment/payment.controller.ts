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

    static async getMyTransactions(req: Request & { user?: any }, res: Response) {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : undefined;
            const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

            const opts: { limit?: number; cursor?: string } = {};
            if (typeof limit === "number" && Number.isFinite(limit)) opts.limit = limit;
            if (cursor) opts.cursor = cursor;

            const data = await PaymentService.getMyTransactions(req.user.id, opts);

            return response({
                res,
                success: true,
                code: 200,
                msg: "Transactions retrieved",
                data,
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 400,
                msg: error.message,
            });
        }
    }

    static async listMyWithdrawals(req: Request & { user?: any }, res: Response) {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : undefined;
            const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

            const opts: { limit?: number; cursor?: string } = {};
            if (typeof limit === "number" && Number.isFinite(limit)) opts.limit = limit;
            if (cursor) opts.cursor = cursor;

            const data = await PaymentService.listMyWithdrawals(req.user.id, opts);

            return response({
                res,
                success: true,
                code: 200,
                msg: "Withdrawals retrieved",
                data,
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 400,
                msg: error.message,
            });
        }
    }

    static async requestWithdrawal(req: Request & { user?: any }, res: Response) {
        try {
            const created = await PaymentService.requestWithdrawal(req.user.id, req.body);
            return response({
                res,
                success: true,
                code: 201,
                msg: "Withdrawal requested",
                data: created,
            });
        } catch (error: any) {
            return response({
                res,
                success: false,
                code: 400,
                msg: error.message,
            });
        }
    }
}
