import type { Request, Response } from "express";
import BookingService from "./booking.services.js";
import { response } from "../../utils/req-res.js";

export default class BookingController {

    static async createBooking(req: Request, res: Response) {

        try {
            const booking = await BookingService.createBooking(req as (Request & {userId: string}), req.body);

            return response({
                success: true,
                msg: "Booking created successfully",
                data: { booking },
                res,
                code: 201
            });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async getBookingById(req: Request, res: Response) {
        try {
            const booking = await BookingService.getBookingById(req.params.id as string);

            if (!booking) {
                return response({
                    success: false,
                    msg: "Booking not found",
                    res,
                    code: 404,
                });
            }

            return response({ success: true, data: { booking }, res, code: 200, msg: 'Booking got' });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async getUserBookings(req: Request, res: Response) {
        try {
            const bookings = await BookingService.getBookingsForUser(req as Request & {userId: string});

            return response({ success: true, data: { bookings }, res, code: 200, msg: 'Bookings got' });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async cancelBooking(req: Request, res: Response) {
        try {
            const updated = await BookingService.cancelBooking(req.params.id as string);

            if (!updated) {
                return response({
                    success: false,
                    msg: "Booking not found",
                    res,
                    code: 404,
                });
            }

            return response({ success: true, msg: "Booking cancelled", data: { updated }, res, code: 201 });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async cancelBookingWithRefund(req: Request, res: Response) {
        try {
            const userId = (req as Request & { userId: string }).userId;
            const { paymentMethod } = req.body;

            const updated = await BookingService.cancelBookingWithRefund(
                req.params.id as string,
                userId,
                paymentMethod
            );

            return response({
                success: true,
                msg: "Booking cancelled and refund processed",
                data: { booking: updated },
                res,
                code: 200
            });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async getHostReservations(req: Request, res: Response) {
        try {
            const hostId = (req as Request & { userId: string }).userId;
            const bookings = await BookingService.getHostReservations(hostId);

            return response({
                success: true,
                data: { bookings },
                res,
                code: 200,
                msg: 'Host reservations retrieved'
            });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async approveBooking(req: Request, res: Response) {
        try {
            const hostId = (req as Request & { userId: string }).userId;
            const updated = await BookingService.approveBooking(
                req.params.id as string,
                hostId
            );

            return response({
                success: true,
                msg: "Booking approved successfully",
                data: { booking: updated },
                res,
                code: 200
            });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }

    static async rejectBooking(req: Request, res: Response) {
        try {
            const hostId = (req as Request & { userId: string }).userId;
            const updated = await BookingService.rejectBooking(
                req.params.id as string,
                hostId
            );

            return response({
                success: true,
                msg: "Booking rejected successfully",
                data: { booking: updated },
                res,
                code: 200
            });

        } catch (err: any) {
            return response({ success: false, msg: err.message, res, code: 400 });
        }
    }
}
