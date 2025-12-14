

import { type Request, type Response } from "express";
import { response } from "../../utils/req-res.js";
import { ListingService } from "./listing.services.js";

export class ListingController {


    static async createListing(req: Request, res: Response) {
        try {
            await ListingService.createListing(res, req.body);
        } catch (err: any) {
            return response({ res, msg: err?.message, code: 400, success: false });
        }
    }


    static async getListingById(req: Request, res: Response) {
        try {
            await ListingService.getListingById(res, req.params.id as string);
            // return res.json({ success: true, data: user });
        } catch (err: any) {
            return response({ res, code: 400, msg: err?.message, success: false })
        }
    }

    static async updateListing(req: Request & { userId?: string }, res: Response) {
        const userId = req?.userId;
        const listingId = req.params.id as string;

        // const editableFeilds = ['name', 'phone', 'role', 'picture'];

        try {
            await ListingService.updateListing(res, userId as string, listingId, req.body);
            // return res.json({ success: true, data: updated });
        } catch (err: any) {
            return res.status(404).json({ success: false, message: err.message });
        }
    }


    static async deleteListing(req: Request & { userId?: string }, res: Response) {
        const userId = req?.userId;
        const listingId = req.params.id as string;

        try {
            await ListingService.deleteListing(res, userId as string, listingId);
            // return res.json({ success: true, data: deleted });
        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }


    static async getAllListings(req: Request, res: Response) {
        try {
            await ListingService.getAllListings();
        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async searchListings(req: Request, res: Response) {
        try {
            const filters = {
                text: req.query.text as string,
                minPrice: req.query.minPrice ? Number(req.query.minPrice) as number : undefined,
                maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) as number : undefined,
                amenities: req.query.amenities
                    ? (req.query.amenities as string).split(",")
                    : undefined,
                date: req.query.date as string,
                location: req.query.location as string,
            };

            const listings = await ListingService.searchListings(filters as any);

            if(listings) return response({ success: true, res, msg: 'Got match listings', data: { listings }, code: 200 })
        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }
}
