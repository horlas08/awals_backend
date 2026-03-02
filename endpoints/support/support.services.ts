import prisma from '../../prisma/client.js';
import { EmailService } from '../email/email.service.js';

export class SupportService {
    static async createSupportTicket(data: {
        userId: string;
        subject: string;
        message: string;
    }) {
        // 1. Save ticket
        const ticket = await prisma.supportTicket.create({
            data: {
                userId: data.userId,
                subject: data.subject,
                message: data.message,
            },
            include: {
                user: true,
            }
        });

        // 2. Send email notification
        try {
            if (ticket.user.email) {
                // Here we could use the language preference of the user if stored, else 'en'
                // Just assuming English by default or detecting Arabic characters
                const lang = /[\u0600-\u06FF]/.test(data.subject + data.message) ? 'ar' : 'en';

                await EmailService.sendSupportAcknowledgement(ticket.user.email, {
                    userName: ticket.user.name,
                    subject: data.subject,
                    message: data.message,
                    language: lang,
                });
            }
        } catch (e) {
            console.error('Failed to send support email:', e);
            // We don't throw, as the ticket was created successfully
        }

        return ticket;
    }
}
