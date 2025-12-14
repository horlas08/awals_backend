import { Router } from "express";
import BookingController from "./booking.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

router.post("/", verifyToken, BookingController.createBooking);

router.get("/:id", BookingController.getBookingById);

router.get("/all/me", verifyToken, BookingController.getUserBookings);

router.patch("/:id/cancel", BookingController.cancelBooking);

export default router;
