import type { IBooking } from "./booking.type.js";
import type { Request } from "express";
import prisma from "../../prisma/client.js";
import { EmailService } from "../email/email.service.js";

export default class BookingService {
  // ---------------------------------------------------------------------
  // CHECK AVAILABILITY
  // ---------------------------------------------------------------------
  static async isListingAvailable(
    where: { listingId?: string; serviceListingId?: string; experienceListingId?: string },
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const overlap = await prisma.booking.findFirst({
      where: {
        ...where,
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
      listingId?: string;
      serviceListingId?: string;
      experienceListingId?: string;
      startDate: Date;
      endDate: Date;
      totalPrice: number;
      guests?: number;
    }
  ) {
    const hasListingId = typeof data.listingId === 'string' && data.listingId.trim().length > 0;
    const hasServiceListingId = typeof data.serviceListingId === 'string' && data.serviceListingId.trim().length > 0;
    const hasExperienceListingId = typeof data.experienceListingId === 'string' && data.experienceListingId.trim().length > 0;

    const idCount = [hasListingId, hasServiceListingId, hasExperienceListingId].filter(Boolean).length;
    if (idCount !== 1) {
      throw new Error('Provide exactly one of listingId, serviceListingId, experienceListingId');
    }

    const availabilityWhere = hasListingId
      ? { listingId: data.listingId }
      : hasServiceListingId
        ? { serviceListingId: data.serviceListingId }
        : { experienceListingId: data.experienceListingId };

    const isAvailable = await this.isListingAvailable(availabilityWhere, data.startDate, data.endDate);

    if (!isAvailable) {
      throw new Error("Listing is not available for these dates");
    }

    const userId = req.userId;

    let bookingTarget:
      | { kind: 'listing'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } }
      | { kind: 'service'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } }
      | { kind: 'experience'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } };

    if (hasListingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: data.listingId },
        include: { user: true },
      });
      if (!listing) throw new Error('Listing not found');
      const host = listing.user;
      const hostName = host.firstName || host.fullName || 'Host';
      bookingTarget = {
        kind: 'listing',
        id: listing.id,
        title: listing.title,
        image: listing.image ?? null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.image ?? null },
      };
    } else if (hasServiceListingId) {
      const service = await (prisma as any).serviceListing.findUnique({
        where: { id: data.serviceListingId },
        include: { host: true },
      });
      if (!service) throw new Error('Service listing not found');
      const host = service.host;
      const hostName = host.firstName || host.fullName || 'Host';
      bookingTarget = {
        kind: 'service',
        id: service.id,
        title: service.title ?? 'Service',
        image: (service.photos && service.photos.length > 0) ? service.photos[0] : null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.image ?? null },
      };
    } else {
      const experience = await (prisma as any).experienceListing.findUnique({
        where: { id: data.experienceListingId },
        include: { host: true },
      });
      if (!experience) throw new Error('Experience listing not found');
      const host = experience.host;
      const hostName = host.firstName || host.fullName || 'Host';
      bookingTarget = {
        kind: 'experience',
        id: experience.id,
        title: experience.title ?? 'Experience',
        image: (experience.photos && experience.photos.length > 0) ? experience.photos[0] : null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.image ?? null },
      };
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
        listingId: hasListingId ? data.listingId : null,
        serviceListingId: hasServiceListingId ? data.serviceListingId : null,
        experienceListingId: hasExperienceListingId ? data.experienceListingId : null,
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

    const host = bookingTarget.host;
    const hostName = host.name;
    const guestName = guest.firstName || guest.fullName || 'Guest';

    // Send emails (fire and forget, don't block on failure)
    try {
      // Send confirmation to guest
      if (guest.email) {
        await EmailService.sendBookingConfirmation(guest.email, {
          guestName,
          listingName: bookingTarget.title,
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
          listingName: bookingTarget.title,
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
          listingId: hasListingId ? (data.listingId as string) : bookingTarget.id,
          content: `Hi ${hostName}! I just booked ${bookingTarget.title} from ${formatDate(data.startDate)} to ${formatDate(data.endDate)}. Looking forward to it!`,
        },
      });
    } catch (msgError) {
      console.error("Failed to create initial message:", msgError);
    }

    return {
      ...booking,
      listing: {
        id: bookingTarget.id,
        title: bookingTarget.title,
        image: bookingTarget.image,
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

