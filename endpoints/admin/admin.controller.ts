import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await prisma.user.count();

        // Active listing counts split by type
        const [activeStays, activeServices, activeExperiences] = await Promise.all([
            prisma.listing.count({ where: { status: 'active' } }),
            prisma.serviceListing.count({ where: { status: 'active' } }),
            prisma.experienceListing.count({ where: { status: 'active' } }),
        ]);
        const activeListings = activeStays + activeServices + activeExperiences;
        const activeListingsByType = { stays: activeStays, services: activeServices, experiences: activeExperiences };

        const pendingBookings = await prisma.booking.count({ where: { status: 'pending' } });
        const pendingWithdrawals = await prisma.withdrawal.count({ where: { status: 'pending' } });
        const openTickets = await prisma.supportTicket.count({ where: { status: 'open' } });

        const revenueAggregation = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { type: 'booking_payment' }
        });
        const totalRevenue = revenueAggregation._sum.amount || 0;

        const recentBookings = await prisma.booking.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, status: true, createdAt: true }
        });

        const recentUsers = await prisma.user.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, createdAt: true }
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalRevenue,
                activeListings,
                activeListingsByType,
                pendingBookings,
                pendingWithdrawals,
                openTickets,
                recentBookings,
                recentUsers,
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                verified: true,
                availableBalance: true,
                pendingBalance: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map availableBalance to balance for the frontend
        const formattedUsers = users.map((user: any) => ({
            ...user,
            balance: user.availableBalance,
            pendingBalance: user.pendingBalance ?? 0
        }));

        res.json({ success: true, data: formattedUsers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getListings = async (req: Request, res: Response) => {
    try {
        const page = parseInt(String(req.query.page ?? '1'));
        const limit = parseInt(String(req.query.limit ?? '10'));
        const skip = (page - 1) * limit;

        const [total, listings] = await Promise.all([
            prisma.listing.count(),
            prisma.listing.findMany({
                select: { id: true, name: true, hostId: true, status: true, pricePerNight: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            })
        ]);

        const formattedListings = listings.map((listing: any) => ({
            ...listing,
            price: listing.pricePerNight
        }));

        res.json({ success: true, data: formattedListings, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getServiceListings = async (req: Request, res: Response) => {
    try {
        const page = parseInt(String(req.query.page ?? '1'));
        const limit = parseInt(String(req.query.limit ?? '10'));
        const skip = (page - 1) * limit;

        const [total, services] = await Promise.all([
            prisma.serviceListing.count(),
            prisma.serviceListing.findMany({
                select: { id: true, title: true, hostId: true, status: true, country: true, category: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            })
        ]);

        const formattedServices = services.map((service: any) => ({
            ...service,
            name: service.title ?? 'Untitled Service'
        }));

        res.json({ success: true, data: formattedServices, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExperienceListings = async (req: Request, res: Response) => {
    try {
        const page = parseInt(String(req.query.page ?? '1'));
        const limit = parseInt(String(req.query.limit ?? '10'));
        const skip = (page - 1) * limit;

        const [total, experiences] = await Promise.all([
            prisma.experienceListing.count(),
            prisma.experienceListing.findMany({
                select: { id: true, title: true, hostId: true, status: true, country: true, category: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            })
        ]);

        const formattedExperiences = experiences.map((exp: any) => ({
            ...exp,
            name: exp.title ?? 'Untitled Experience'
        }));

        res.json({ success: true, data: formattedExperiences, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBookings = async (req: Request, res: Response) => {
    try {
        const bookings = await prisma.booking.findMany({
            select: {
                id: true,
                name: true,
                guestId: true,
                startDate: true,
                endDate: true,
                totalPrice: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: bookings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await prisma.transaction.findMany({
            select: {
                id: true,
                userId: true,
                type: true,
                amount: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getWithdrawals = async (req: Request, res: Response) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        res.json({ success: true, data: withdrawals });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSupportTickets = async (req: Request, res: Response) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        res.json({ success: true, data: tickets });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
            include: { reviewer: true, reviewee: true, listing: true }
        });
        res.json({ success: true, data: reviews });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAppSettings = async (req: Request, res: Response) => {
    try {
        let settings = await prisma.appSettings.findFirst();
        if (!settings) {
            settings = await prisma.appSettings.create({ data: {} });
        }
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateAppSettings = async (req: Request, res: Response) => {
    try {
        let settings = await prisma.appSettings.findFirst();
        if (!settings) {
            settings = await prisma.appSettings.create({ data: req.body });
        } else {
            settings = await prisma.appSettings.update({
                where: { id: settings.id },
                data: req.body
            });
        }
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.id);
        await prisma.user.delete({ where: { id: userId } });
        res.json({ success: true, message: 'User deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateListingStatus = async (req: Request, res: Response) => {
    try {
        const listingId = String(req.params.id);
        const status = req.body.status;
        const type = req.query.type as string; // 'listings' | 'services' | 'experiences'

        let result;
        if (type === 'services') {
            result = await prisma.serviceListing.update({ where: { id: listingId }, data: { status } });
        } else if (type === 'experiences') {
            result = await prisma.experienceListing.update({ where: { id: listingId }, data: { status } });
        } else {
            result = await prisma.listing.update({ where: { id: listingId }, data: { status } });
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteListing = async (req: Request, res: Response) => {
    try {
        const listingId = String(req.params.id);
        const type = req.query.type as string; // 'listings' | 'services' | 'experiences'

        let result;
        if (type === 'services') {
            result = await prisma.serviceListing.update({ where: { id: listingId }, data: { deleted: true } });
        } else if (type === 'experiences') {
            result = await prisma.experienceListing.update({ where: { id: listingId }, data: { deleted: true } });
        } else {
            result = await prisma.listing.update({ where: { id: listingId }, data: { deleted: true } });
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const replyTicket = async (req: Request, res: Response) => {
    try {
        const ticketId = String(req.params.id);
        const { message } = req.body;

        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: { user: { select: { email: true, name: true } } }
        });

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const updated = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'in_progress', adminReply: message } as any
        });

        // Optional email via nodemailer if SMTP is configured
        if (process.env.SMTP_HOST) {
            const nodemailerPkg = await import('nodemailer').catch(() => null);
            if (nodemailerPkg) {
                const transporter = nodemailerPkg.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT ?? '587'),
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
                await transporter.sendMail({
                    from: process.env.SMTP_FROM ?? 'no-reply@awals.app',
                    to: ticket.user.email,
                    subject: `Re: ${ticket.subject}`,
                    text: `Dear ${ticket.user.name},\n\n${message}\n\nBest regards,\nAwals Support Team`,
                }).catch(console.error);
            }
        }

        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const closeTicket = async (req: Request, res: Response) => {
    try {
        const ticketId = String(req.params.id);
        const updated = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'closed' }
        });
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const blockUser = async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.id);
        const user = await (prisma.user as any).findUnique({ where: { id: userId }, select: { blocked: true } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const updated = await (prisma.user as any).update({
            where: { id: userId },
            data: { blocked: !user.blocked }
        });
        res.json({ success: true, data: updated, blocked: updated.blocked });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = String(req.params.id);
        const { name, email, role } = req.body;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { ...(name && { name }), ...(email && { email }), ...(role && { role }) }
        });
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getListingDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const listing = await prisma.listing.findUnique({
            where: { id },
            include: {
                host: { select: { id: true, name: true, email: true, picture: true, phone: true, verified: true } },
            }
        });
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        res.json({ success: true, data: listing });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getServiceDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const service = await prisma.serviceListing.findUnique({
            where: { id },
            include: {
                host: { select: { id: true, name: true, email: true, picture: true, phone: true, verified: true } },
            }
        });
        if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
        res.json({ success: true, data: service });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExperienceDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const experience = await prisma.experienceListing.findUnique({
            where: { id },
            include: {
                host: { select: { id: true, name: true, email: true, picture: true, phone: true, verified: true } },
            }
        });
        if (!experience) return res.status(404).json({ success: false, message: 'Experience not found' });
        res.json({ success: true, data: experience });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getUserDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, phone: true, picture: true,
                role: true, verified: true, createdAt: true, lastSeen: true,
                availableBalance: true, pendingBalance: true,
                listings: { select: { id: true, name: true, status: true }, take: 5 },
                serviceListings: { select: { id: true, title: true, status: true }, take: 5 },
                experienceListings: { select: { id: true, title: true, status: true }, take: 5 },
                bookings: { select: { id: true, name: true, status: true, createdAt: true }, take: 5, orderBy: { createdAt: 'desc' } },
            }
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const blockedUser = await (prisma.user as any).findUnique({ where: { id }, select: { blocked: true } });
        res.json({ success: true, data: { ...user, blocked: blockedUser?.blocked ?? false } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
