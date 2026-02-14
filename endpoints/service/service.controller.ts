import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';
import { response } from '../../utils/req-res.js';

// ----------------------------------------------------------------------
// Create a new Service Listing (Draft)
// ----------------------------------------------------------------------
export const createServiceListing = async (req: Request, res: Response) => {
    try {
        const { status, ...data } = req.body as any;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        // Ensure hostId is provided or derived from authenticated user
        // For now assuming passed in body or req.user (middleware usage)
        // const userId = req.user?.id; 

        // Create a new listing with minimal required fields or as a draft
        const listing = await prisma.serviceListing.create({
            data: {
                hostId,
                status: status || 'pending',
                ...data,
            },
        });

        return response({ res, code: 201, success: true, msg: 'ok', data: listing });
    } catch (error: any) {
        console.error('Error creating service listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Update an existing Service Listing (Step-by-step)
// ----------------------------------------------------------------------
export const updateServiceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body as any;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        const existing = await prisma.serviceListing.findUnique({ where: { id } });
        if (!existing) {
            return response({ res, code: 404, success: false, msg: 'Listing not found', data: null });
        }
        if (existing.hostId?.toString() !== hostId) {
            return response({ res, code: 401, success: false, msg: 'Unauthorized', data: null });
        }

        const listing = await prisma.serviceListing.update({
            where: { id },
            data: {
                ...data,
            },
        });

        return response({ res, code: 200, success: true, msg: 'ok', data: listing });
    } catch (error: any) {
        console.error('Error updating service listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Get a Service Listing by ID
// ----------------------------------------------------------------------
export const getServiceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const hostId = (req as any).user?.id?.toString();
        if (!hostId) {
            return response({ res, code: 401, success: false, msg: 'Authorization required', data: null });
        }

        const listing = await prisma.serviceListing.findUnique({
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
        console.error('Error fetching service listing:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};

// ----------------------------------------------------------------------
// Upload Image for Service Listing
// ----------------------------------------------------------------------
export const uploadServiceImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return response({ res, code: 400, success: false, msg: 'No file uploaded', data: null });
        }

        // Assuming multer middleware handles the upload and puts file in 'uploads/'
        // Construct the public URL or path
        const filePath = `/uploads/${req.file.filename}`;

        // Note: We are not automatically adding it to the 'photos' array here
        // The frontend should receive the path and then call 'updateServiceListing' to add it to the array.
        // OR we could update it here if 'id' is passed.

        return response({ res, code: 200, success: true, msg: 'ok', data: { path: filePath } });
    } catch (error: any) {
        console.error('Error uploading image:', error);
        return response({ res, code: 500, success: false, msg: error.message, data: null });
    }
};
