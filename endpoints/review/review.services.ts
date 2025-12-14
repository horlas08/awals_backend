import type { IReview } from "./review.type.js";
import type { Request } from "express";
import prisma from "../../prisma/client.js";

export default class ReviewService {

    // ------------------------------------------------------------
    // CREATE REVIEW
    // ------------------------------------------------------------
    static async createReview(
        req: Request & { userId: string },
        data: {
            bookingId: string;
            revieweeId: string; 
            listingId: string; 
            rating: number;
            comment: string;
        }
    ) {

        const reviewerId = req.userId as string;

        // 1. CHECK BOOKING EXISTS
        const booking = await prisma.booking.findUnique({
            where: { id: data.bookingId }
        });

        if (!booking) {
            throw new Error("Booking not found");
        }

        // 2. ENSURE USER OWNS THIS BOOKING
        if (booking.guestId !== reviewerId) {
            throw new Error("You cannot review a booking that is not yours");
        }

        // 3. CHECK IF USER HAS ALREADY REVIEWED THIS BOOKING
        const exists = await prisma.review.findFirst({
            where: {
                bookingId: data.bookingId,
                reviewerId
            },
        });

        if (exists) {
            throw new Error("You have already reviewed this booking");
        }

        // 4. CREATE REVIEW
        const review = await prisma.review.create({
            data: {
                bookingId: data.bookingId,
                reviewerId,
                revieweeId: data.revieweeId,
                rating: data.rating,
                listingId: data.listingId,
                comment: data.comment
            }
        });

        return review;
    }

    // ------------------------------------------------------------
    // GET REVIEWS FOR A LISTING
    // ------------------------------------------------------------
    static async getReviewsForListing(listingId: string) {

        const reviews = await prisma.review.findMany({
            where: {
                listingId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return reviews;
    }
}
