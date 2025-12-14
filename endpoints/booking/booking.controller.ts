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
}
