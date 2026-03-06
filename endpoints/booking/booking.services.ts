import type { IBooking } from "./booking.type.js";
import type { Request } from "express";
import prisma from "../../prisma/client.js";
import { EmailService } from "../email/email.service.js";

export default class BookingService {
  private static async getAppSettings() {
    const existing = await (prisma as any).appSettings.findFirst({});
    if (existing) return existing;
    return await (prisma as any).appSettings.create({ data: {} });
  }

  private static coerceDate(value: unknown, fieldName: string): Date {
    if (value instanceof Date) return value;
    if (typeof value !== "string") {
      throw new Error(`${fieldName} must be a valid date`);
    }

    let s = value.trim();
    if (!s) throw new Error(`${fieldName} must be a valid date`);

    // If we get microseconds (6+ digits), truncate to milliseconds.
    // Example: 2026-03-07T20:28:05.556417 -> 2026-03-07T20:28:05.556
    s = s.replace(/\.(\d{3})\d+/, ".$1");

    // If no timezone is present, assume UTC.
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
      s = `${s}Z`;
    }

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`${fieldName} must be a valid ISO-8601 DateTime`);
    }
    return d;
  }

  // ---------------------------------------------------------------------
  // CHECK AVAILABILITY
  // ---------------------------------------------------------------------
  static async isListingAvailable(
    where:
      | { listingId: string; serviceListingId?: never; experienceListingId?: never }
      | { serviceListingId: string; listingId?: never; experienceListingId?: never }
      | { experienceListingId: string; listingId?: never; serviceListingId?: never },
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
      startDate: Date | string;
      endDate: Date | string;
      totalPrice: number;
      guests?: number;
      paymentMethod?: string;
      fxRate?: number;
      fxAmount?: number;
      fxCurrency?: string;
    }
  ) {
    const hasListingId = typeof data.listingId === 'string' && data.listingId.trim().length > 0;
    const hasServiceListingId = typeof data.serviceListingId === 'string' && data.serviceListingId.trim().length > 0;
    const hasExperienceListingId = typeof data.experienceListingId === 'string' && data.experienceListingId.trim().length > 0;

    const idCount = [hasListingId, hasServiceListingId, hasExperienceListingId].filter(Boolean).length;
    if (idCount !== 1) {
      throw new Error('Provide exactly one of listingId, serviceListingId, experienceListingId');
    }

    const listingId = hasListingId ? data.listingId!.trim() : undefined;
    const serviceListingId = hasServiceListingId ? data.serviceListingId!.trim() : undefined;
    const experienceListingId = hasExperienceListingId ? data.experienceListingId!.trim() : undefined;

    const availabilityWhere = hasListingId
      ? ({ listingId } as { listingId: string })
      : hasServiceListingId
        ? ({ serviceListingId } as { serviceListingId: string })
        : ({ experienceListingId } as { experienceListingId: string });

    const startDate = this.coerceDate(data.startDate, "startDate");
    const endDate = this.coerceDate(data.endDate, "endDate");

    const isAvailable = await this.isListingAvailable(availabilityWhere, startDate, endDate);

    if (!isAvailable) {
      throw new Error("Listing is not available for these dates");
    }

    const userId = req.userId;

    let bookingTarget:
      | { kind: 'listing'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } }
      | { kind: 'service'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } }
      | { kind: 'experience'; id: string; title: string; image: string | null; host: { id: string; name: string; email: string | null; image: string | null } };

    let listingApprovalMode: 'instant' | 'manual' | null = null;

    if (hasListingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId as string },
        include: { host: true },
      });
      if (!listing) throw new Error('Listing not found');

      listingApprovalMode = (listing as any).bookingApprovalMode ?? null;

      const host = listing.host;
      const hostName = host.name || 'Host';

      const firstImage = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : null;
      bookingTarget = {
        kind: 'listing',
        id: listing.id,
        title: listing.name || 'Listing',
        image: (firstImage ?? listing.picture ?? null) as string | null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.picture ?? null },
      };
    } else if (hasServiceListingId) {
      const service = await (prisma as any).serviceListing.findUnique({
        where: { id: serviceListingId },
        include: { host: true },
      });
      if (!service) throw new Error('Service listing not found');
      const host = service.host;
      const hostName = host.name || 'Host';
      bookingTarget = {
        kind: 'service',
        id: service.id,
        title: service.title ?? 'Service',
        image: (service.photos && service.photos.length > 0) ? (service.photos[0] as string) : null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.picture ?? null },
      };
    } else {
      const experience = await (prisma as any).experienceListing.findUnique({
        where: { id: experienceListingId },
        include: { host: true },
      });
      if (!experience) throw new Error('Experience listing not found');
      const host = experience.host;
      const hostName = host.name || 'Host';
      bookingTarget = {
        kind: 'experience',
        id: experience.id,
        title: experience.title ?? 'Experience',
        image: (experience.photos && experience.photos.length > 0) ? (experience.photos[0] as string) : null,
        host: { id: host.id, name: hostName, email: host.email ?? null, image: host.picture ?? null },
      };
    }

    // Fetch guest info
    const guest = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!guest) {
      throw new Error("Guest not found");
    }

    const settings = await this.getAppSettings();
    const commissionPercent =
      typeof settings?.serviceCommissionPercent === 'number'
        ? settings.serviceCommissionPercent
        : 0;
    const bookingPoints =
      typeof settings?.bookingPoints === 'number' ? settings.bookingPoints : 0;

    const pointsPerDollar =
      typeof settings?.pointsPerDollar === 'number' ? settings.pointsPerDollar : 0;

    const commissionRate = Math.max(0, Math.min(commissionPercent, 100)) / 100;
    const totalAmount = Number(data.totalPrice ?? 0);
    const hostEarning = Math.max(0, totalAmount * (1 - commissionRate));

    const paymentMethod = typeof data.paymentMethod === 'string' ? data.paymentMethod.trim() : '';
    const isPointsPayment = paymentMethod === 'points';
    const requiredPoints = isPointsPayment
      ? Math.max(0, Math.ceil(totalAmount * Math.max(0, pointsPerDollar)))
      : 0;

    const fxRate = typeof data.fxRate === 'number' ? data.fxRate : undefined;
    const fxAmount = typeof data.fxAmount === 'number' ? data.fxAmount : undefined;
    const fxCurrency = typeof data.fxCurrency === 'string' ? data.fxCurrency.trim() : '';

    const shouldAwaitApproval =
      bookingTarget.kind === 'listing' && listingApprovalMode === 'manual';

    const booking = await prisma.$transaction(async (tx) => {
      if (isPointsPayment) {
        if (pointsPerDollar <= 0) {
          throw new Error('Points payment is not configured');
        }
        const current = await (tx as any).user.findUnique({
          where: { id: userId },
          select: { royalPointsBalance: true },
        });
        const bal = typeof current?.royalPointsBalance === 'number' ? current.royalPointsBalance : 0;
        if (bal < requiredPoints) {
          throw new Error('Insufficient royal points');
        }

        await (tx as any).user.update({
          where: { id: userId },
          data: {
            royalPointsBalance: { decrement: requiredPoints },
          },
        });
      }

      const created = await tx.booking.create({
        data: {
          name: data.name,
          picture: data.picture,
          ...(hasListingId ? { listingId: listingId as string } : {}),
          ...(hasServiceListingId
            ? { serviceListingId: serviceListingId as string }
            : {}),
          ...(hasExperienceListingId
            ? { experienceListingId: experienceListingId as string }
            : {}),
          guestId: userId,
          startDate: startDate,
          endDate: endDate,
          totalPrice: totalAmount,
          status: (shouldAwaitApproval ? 'awaiting_approval' : 'confirmed') as any,
        },
      });

      await tx.user.update({
        where: { id: bookingTarget.host.id },
        data: {
          pendingBalance: { increment: hostEarning },
        },
      });

      if (bookingPoints > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            royalPointsBalance: { increment: bookingPoints },
          } as any,
        });
      }

      await (tx as any).transaction.createMany({
        data: [
          {
            userId,
            bookingId: created.id,
            type: 'booking_payment',
            amount: isPointsPayment ? 0 : -Math.abs(totalAmount),
            currency: 'USD',
            points: isPointsPayment ? -Math.abs(requiredPoints) : 0,
            counterpartyUserId: bookingTarget.host.id,
            note: `Booking payment for ${bookingTarget.title}`,
            meta: {
              kind: bookingTarget.kind,
              listingId: hasListingId ? listingId : null,
              serviceListingId: hasServiceListingId ? serviceListingId : null,
              experienceListingId: hasExperienceListingId ? experienceListingId : null,
              commissionPercent,
              paymentMethod: isPointsPayment ? 'points' : 'cash',
              requiredPoints: isPointsPayment ? requiredPoints : null,
              pointsPerDollar,
              ...(fxRate !== undefined ? { fxRate } : {}),
              ...(fxAmount !== undefined ? { fxAmount } : {}),
              ...(fxCurrency ? { fxCurrency } : {}),
            },
          },
          {
            userId: bookingTarget.host.id,
            bookingId: created.id,
            type: 'host_earning_pending',
            amount: hostEarning,
            currency: 'USD',
            points: 0,
            counterpartyUserId: userId,
            note: `Pending earning for ${bookingTarget.title}`,
            meta: {
              kind: bookingTarget.kind,
              grossAmount: totalAmount,
              commissionPercent,
              paymentMethod: isPointsPayment ? 'points' : 'cash',
            },
          },
          ...(bookingPoints > 0
            ? [
              {
                userId,
                bookingId: created.id,
                type: 'points_award',
                amount: 0,
                currency: 'USD',
                points: bookingPoints,
                counterpartyUserId: null,
                note: `Points awarded for booking ${bookingTarget.title}`,
                meta: {
                  pointsPerDollar: settings?.pointsPerDollar ?? 0,
                  bookingPoints,
                },
              },
            ]
            : []),
        ],
      });

      return created;
    });

    // Format dates for email
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    const host = bookingTarget.host;
    const hostName = host.name;
    const guestName = guest.name || 'Guest';

    // Send emails (fire and forget, don't block on failure)
    try {
      // Send confirmation to guest
      if (guest.email) {
        await EmailService.sendBookingConfirmation(guest.email, {
          guestName,
          listingName: bookingTarget.title,
          hostName,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          totalPrice: data.totalPrice,
        });
      }

      // Send notification to host
      if (host.email) {
        await EmailService.sendNewBookingNotification(host.email, {
          hostName,
          guestName,
          listingName: bookingTarget.title,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          totalPrice: data.totalPrice,
        });
      }
    } catch (emailError) {
      console.error("Failed to send booking emails:", emailError);
    }

    // Create initial chat message from guest to host
    try {
      if (hasListingId) {
        await prisma.message.create({
          data: {
            fromUserId: userId,
            toUserId: host.id,
            listingId: listingId as string,
            content: `Hi ${hostName}! I just booked ${bookingTarget.title} from ${formatDate(startDate)} to ${formatDate(endDate)}. Looking forward to it!`,
          },
        });
      }
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
      include: {
        listing: {
          include: {
            host: {
              select: { id: true, name: true, picture: true, email: true },
            },
          },
        },
        serviceListing: {
          include: {
            host: {
              select: { id: true, name: true, picture: true, email: true },
            },
          },
        },
        experienceListing: {
          include: {
            host: {
              select: { id: true, name: true, picture: true, email: true },
            },
          },
        },
      },
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

