import { Router } from "express";
import { verifyToken } from "../auth/auth.middleware.js";
import ReviewController from "./review.controller.js";

const router = Router();

router.post("/create", verifyToken, ReviewController.createReview);

router.get("/:listingId/reviews", ReviewController.getListingReviews);


export default router;
