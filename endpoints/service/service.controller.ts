import type { Request, Response } from 'express';
import prisma from '../../prisma/client.js';

// ----------------------------------------------------------------------
// Create a new Service Listing (Draft)
// ----------------------------------------------------------------------
export const createServiceListing = async (req: Request, res: Response) => {
    try {
        const { hostId, status, ...data } = req.body;

        // Ensure hostId is provided or derived from authenticated user
        // For now assuming passed in body or req.user (middleware usage)
        // const userId = req.user?.id; 

        // Create a new listing with minimal required fields or as a draft
        const listing = await prisma.serviceListing.create({
            data: {
                hostId: hostId, // Should come from auth middleware
                status: status || 'pending',
                ...data,
            },
        });

        return res.status(201).json({ success: true, data: listing });
    } catch (error: any) {
        console.error('Error creating service listing:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// Update an existing Service Listing (Step-by-step)
// ----------------------------------------------------------------------
export const updateServiceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const listing = await prisma.serviceListing.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });

        return res.status(200).json({ success: true, data: listing });
    } catch (error: any) {
        console.error('Error updating service listing:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// Get a Service Listing by ID
// ----------------------------------------------------------------------
export const getServiceListing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const listing = await prisma.serviceListing.findUnique({
            where: { id },
        });

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        return res.status(200).json({ success: true, data: listing });
    } catch (error: any) {
        console.error('Error fetching service listing:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// Upload Image for Service Listing
// ----------------------------------------------------------------------
export const uploadServiceImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Assuming multer middleware handles the upload and puts file in 'uploads/'
        // Construct the public URL or path
        const filePath = `uploads/${req.file.filename}`;

        // Note: We are not automatically adding it to the 'photos' array here
        // The frontend should receive the path and then call 'updateServiceListing' to add it to the array.
        // OR we could update it here if 'id' is passed.

        return res.status(200).json({ success: true, path: filePath });
    } catch (error: any) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
