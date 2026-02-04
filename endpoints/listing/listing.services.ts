import { response } from "../../utils/req-res.js";
import type { Response } from "express";
import type { IListing } from "./listing.type.js";
import prisma from "../../prisma/client.js";

const db: any = prisma;

export class ListingService {

    // ------------------------------------------------------------
    // CREATE LISTING
    // ------------------------------------------------------------
    static async createListing(
        res: Response,
        data: Partial<IListing> & { userId: string }
    ) {

        const {
            hostId,
            name,
            description,
            address,
            images,
            pricePerNight,
            country,
            category,
            rating,
            amenities,
            rules,
            cancellationPolicy,
            deleted,
            lat,
            lng,
        } = data;

        const listing = await db.listing.create({
            data: {
                hostId: hostId as string,
                name: name as string,
                description: description as string,
                address: address as string,
                lat: lat as number,
                lng: lng as number,
                images: images as string[],
                pricePerNight: pricePerNight as string,
                country: country as string,
                category: category as string,
                rating: rating as number,
                amenities: amenities as string[],
                rules: rules as string,
                cancellationPolicy: cancellationPolicy as string,
                deleted: deleted as boolean,
            },
        });

        return response({
            res,
            msg: "Listing created",
            code: 201,
            success: true,
            data: { listing },
        });
    }

    // ------------------------------------------------------------
    // GET BY ID
    // ------------------------------------------------------------
    static async getListingById(res: Response, id: string) {
        const listing = await db.listing.findUnique({
            where: { id },
        });

        if (!listing)
            return response({ res, msg: "Listing not found!", code: 404, success: false });

        return response({
            res,
            msg: "Got listing",
            code: 200,
            success: true,
            data: { listing },
        });
    }

    // ------------------------------------------------------------
    // UPDATE LISTING
    // ------------------------------------------------------------
    static async updateListing(
        res: Response,
        userId: string,
        listingId: string,
        data: Partial<IListing>
    ) {

        const updated = await db.listing.updateMany({
            where: { id: listingId, hostId: userId },
            data,
        });

        if (updated.count === 0)
            return response({ msg: "Listing not found", res, code: 404, success: false });

        const updatedListing = await db.listing.findUnique({
            where: { id: listingId },
        });

        return response({
            msg: `Your listing ${updatedListing?.deleted ? "deleted" : "updated"}`,
            res,
            code: 201,
            success: true,
            data: { listing: updatedListing },
        });
    }

    // ------------------------------------------------------------
    // DELETE LISTING
    // ------------------------------------------------------------
    static async deleteListing(res: Response, userId: string, listingId: string) {

        const updated = await db.listing.updateMany({
            where: { id: listingId, hostId: userId },
            data: { deleted: true },
        });

        if (updated.count === 0)
            return response({ msg: "Listing not found!", res, code: 404, success: false });

        return response({
            msg: "Your listing deleted",
            res,
            code: 201,
            success: true,
            data: { deleted: true },
        });
    }

    // ------------------------------------------------------------
    // GET ALL
    // ------------------------------------------------------------
    static async getAllListings() {
        return db.listing.findMany();
    }

    // ------------------------------------------------------------
    // SEARCH LISTINGS
    // ------------------------------------------------------------
    static async searchListings(filters: {
        text?: string;
        minPrice?: number;
        maxPrice?: number;
        amenities?: string[];
        date?: string;
        location?: string;
    } = {}) {

        const where: any = {
            deleted: false,
        };

        if (filters.text) {
            where.OR = [
                { name: { contains: filters.text, mode: "insensitive" } },
                { description: { contains: filters.text, mode: "insensitive" } },
            ];
        }

        if (filters.minPrice || filters.maxPrice) {
            where.pricePerNight = {};
            if (filters.minPrice !== undefined)
                where.pricePerNight.gte = filters.minPrice;
            if (filters.maxPrice !== undefined)
                where.pricePerNight.lte = filters.maxPrice;
        }

        if (filters.amenities?.length) {
            where.amenities = { hasEvery: filters.amenities };
        }

        if (filters.location) {
            where.address = {
                contains: filters.location,
                mode: "insensitive",
            };
        }

        if (filters.date) {
            where.calendar = {
                some: {
                    date: filters.date,
                    isBooked: false,
                },
            };
        }

        return db.listing.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
    }
}
