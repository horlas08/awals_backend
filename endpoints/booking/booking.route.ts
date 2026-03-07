import { Router } from "express";
import BookingController from "./booking.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

router.post("/", verifyToken, BookingController.createBooking);

router.get("/all/me", verifyToken, BookingController.getUserBookings);

router.get("/host/reservations", verifyToken, BookingController.getHostReservations);

router.get("/:id", BookingController.getBookingById);

router.patch("/:id/cancel", BookingController.cancelBooking);

router.post("/:id/cancel", verifyToken, BookingController.cancelBookingWithRefund);

router.post("/:id/approve", verifyToken, BookingController.approveBooking);

router.post("/:id/reject", verifyToken, BookingController.rejectBooking);

export default router;
