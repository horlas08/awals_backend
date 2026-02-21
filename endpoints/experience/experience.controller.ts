import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';
import { response } from '../../utils/req-res.js';

const db: any = prisma;

// ----------------------------------------------------------------------
// Create a new Experience Listing (Draft)
// ----------------------------------------------------------------------
export const createExperienceListing = async (req: Request, res: Response) => {
    try {
        const { status, ...data } = req.body as any;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        const listing = await db.experienceListing.create({
            data: {
                hostId,
                status: status || 'pending',
                ...data,
            },
        });

        return response({ res, code: 201, success: true, msg: 'ok', data: listing });
    } catch (error: any) {
        console.error('Error creating experience listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Update an existing Experience Listing (Step-by-step)
// ----------------------------------------------------------------------
export const updateExperienceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body as any;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        const existing = await db.experienceListing.findUnique({ where: { id } });
        if (!existing) {
            return response({ res, code: 404, success: false, msg: 'Listing not found', data: null });
        }
        if (existing.hostId?.toString() !== hostId) {
            return response({ res, code: 401, success: false, msg: 'Unauthorized', data: null });
        }

        const listing = await db.experienceListing.update({
            where: { id },
            data: {
                ...data,
            },
        });

        return response({ res, code: 200, success: true, msg: 'ok', data: listing });
    } catch (error: any) {
        console.error('Error updating experience listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Get an Experience Listing by ID
// ----------------------------------------------------------------------
export const getExperienceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        const listing = await db.experienceListing.findUnique({
            where: { id },
        });

        if (!listing) {
            return response({ res, code: 404, success: false, msg: 'Listing not found', data: null });
        }

        if (listing.hostId?.toString() !== hostId) {
            return response({ res, code: 401, success: false, msg: 'Unauthorized', data: null });
        }

        return response({ res, code: 200, success: true, msg: 'ok', data: listing });
    } catch (error: any) {
        console.error('Error fetching experience listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Upload Image for Experience Listing
// ----------------------------------------------------------------------
export const uploadExperienceImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return response({ res, code: 400, success: false, msg: 'No file uploaded', data: null });
        }

        const filePath = `/uploads/${req.file.filename}`;

        return response({ res, code: 200, success: true, msg: 'ok', data: { path: filePath } });
    } catch (error: any) {
        console.error('Error uploading image:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};
