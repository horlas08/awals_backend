import type { Request, Response } from "express";
import ReviewService from "./review.services.js";
import { response } from "../../utils/req-res.js";


export default class ReviewController {

    static async createReview(req: Request, res: Response) {
        try {
            const body = req.body;

            const review = await ReviewService.createReview(req as Request & {userId: string}, {
                bookingId: body.bookingId,
                revieweeId: body.revieweeId,
                rating: Number(body.rating),
                comment: body.comment,
                listingId: body.listingId
            });

            return response({
                success: true,
                msg: "Review created successfully",
                data: review,
                res,
                code: 201
            });

        } catch (err: any) {
            return response({
                success: false,
                msg: err.message,
                res,
                code: 400
            });
        }
    }

    static async getListingReviews(req: Request, res: Response) {
        try {
            const listingId = req.params.listingId;

            const reviews = await ReviewService.getReviewsForListing(listingId as string);

            return response({
                success: true,
                data: reviews,
                res,
                msg: 'Got reviews for listing',
                code: 200
            });

        } catch (err: any) {
            return response({
                success: false,
                msg: err.message,
                res,
                code: 400
            });
        }
    }
}
