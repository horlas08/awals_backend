import type { IBooking } from "./booking.type.js";
import type { Request } from "express";
import prisma from "../../prisma/client.js";
import { EmailService } from "../email/email.service.js";

export default class BookingService {
  // ---------------------------------------------------------------------
  // CHECK AVAILABILITY
  // ---------------------------------------------------------------------
  static async isListingAvailable(
    listingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const overlap = await prisma.booking.findFirst({
      where: {
        listingId,
        status: { not: "cancelled" },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    return !overlap;
  }

  // ---------------------------------------------------------------------
  // CREATE BOOKING
  // ---------------------------------------------------------------------
  static async createBooking(
    req: Request & { userId: string },
    data: {
      name: string;
      picture: string;
      listingId: string;
      startDate: Date;
      endDate: Date;
      totalPrice: number;
      guests?: number;
    }
  ) {
    const isAvailable = await this.isListingAvailable(
      data.listingId,
      data.startDate,
      data.endDate
    );

    if (!isAvailable) {
      throw new Error("Listing is not available for these dates");
    }

    const userId = req.userId;

    // Fetch listing with host info
    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
      include: { user: true },
    });

    if (!listing) {
      throw new Error("Listing not found");
    }

    // Fetch guest info
    const guest = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!guest) {
      throw new Error("Guest not found");
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        name: data.name,
        picture: data.picture,
        listingId: data.listingId,
        guestId: userId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalPrice: data.totalPrice,
        status: "confirmed",
      },
    });

    // Format dates for email
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    const host = listing.user;
    const hostName = host.firstName || host.fullName || 'Host';
    const guestName = guest.firstName || guest.fullName || 'Guest';

    // Send emails (fire and forget, don't block on failure)
    try {
      // Send confirmation to guest
      if (guest.email) {
        await EmailService.sendBookingConfirmation(guest.email, {
          guestName,
          listingName: listing.title,
          hostName,
          startDate: formatDate(data.startDate),
          endDate: formatDate(data.endDate),
          totalPrice: data.totalPrice,
        });
      }

      // Send notification to host
      if (host.email) {
        await EmailService.sendNewBookingNotification(host.email, {
          hostName,
          guestName,
          listingName: listing.title,
          startDate: formatDate(data.startDate),
          endDate: formatDate(data.endDate),
          totalPrice: data.totalPrice,
        });
      }
    } catch (emailError) {
      console.error("Failed to send booking emails:", emailError);
    }

    // Create initial chat message from guest to host
    try {
      await prisma.message.create({
        data: {
          fromUserId: userId,
          toUserId: host.id,
          listingId: data.listingId,
          content: `Hi ${hostName}! I just booked ${listing.title} from ${formatDate(data.startDate)} to ${formatDate(data.endDate)}. Looking forward to my stay!`,
        },
      });
    } catch (msgError) {
      console.error("Failed to create initial message:", msgError);
    }

    return {
      ...booking,
      listing: {
        id: listing.id,
        title: listing.title,
        image: listing.image,
      },
      host: {
        id: host.id,
        name: hostName,
        image: host.image,
      },
    };
  }

  // ---------------------------------------------------------------------
  // GET BOOKING BY ID
  // ---------------------------------------------------------------------
  static async getBookingById(id: string) {
    return await prisma.booking.findUnique({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------
  // GET BOOKINGS FOR USER
  // ---------------------------------------------------------------------
  static async getBookingsForUser(
    req: Request & { userId: string }
  ) {
    const userId = req.userId;

    return await prisma.booking.findMany({
      where: { guestId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------
  // CANCEL BOOKING
  // ---------------------------------------------------------------------
  static async cancelBooking(id: string) {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return booking;
  }
}

