import { type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { SupportService } from './support.services.js';

export class SupportController {
    static async createSupportTicket(req: Request & { user?: any }, res: Response): Promise<void> {
        const { subject, message } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED).json({ success: false, msg: 'Unauthorized' });
            return;
        }

        if (!subject || !message) {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, msg: 'Subject and message are required' });
            return;
        }

        try {
            const ticket = await SupportService.createSupportTicket({
                userId,
                subject,
                message,
            });

            res.status(StatusCodes.CREATED).json({ success: true, data: ticket });
        } catch (e: any) {
            console.error(e);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, msg: e.message || 'Server Error' });
        }
    }
}
