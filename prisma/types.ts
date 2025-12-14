// ==========================
// ENUMS
// ==========================

export enum ERole {
  guest = "guest",
  host = "host",
  both = "both",
}

export enum EBookingStatus {
  pending = "pending",
  confirmed = "confirmed",
  cancelled = "cancelled",
}

// ==========================
// USER
// ==========================

export interface IUser {
  id: string;
  uid: string;
  name: number;
  phone: number;
  verified: boolean;
  email: string;
  passwordHash?: string | null;
  picture?: string | null;
  role: ERole;
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  listings?: IListing[];
  bookings?: IBooking[];
  messagesSent?: IMessage[];
  messagesRecv?: IMessage[];
  reviewsGiven?: IReview[];
  reviewsRecvd?: IReview[];
  tokens?: IToken[];
}

// ==========================
// LISTING
// ==========================

export interface IListing {
  id: string;
  name: number;
  hostId: string;
  description?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  images: string[];
  pricePerNight?: number | null;
  amenities: string[];
  rules?: string | null;
  cancellationPolicy?: string | null;
  picture?: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  host?: IUser;
  bookings?: IBooking[];
  messages?: IMessage[];
  reviews?: IReview[];
}

// ==========================
// BOOKING
// ==========================

export interface IBooking {
  id: string;
  name: number;
  picture?: string | null;
  listingId: string;
  guestId: string;
  startDate: Date;
  endDate: Date;
  totalPrice?: number | null;
  status: EBookingStatus;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  listing?: IListing;
  guest?: IUser;
}

// ==========================
// MESSAGE
// ==========================

export interface IMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  listingId: string;
  content?: string | null;
  createdAt: Date;
  updatedAt: Date;

  fromUser?: IUser;
  toUser?: IUser;
  listing?: IListing;
}

// ==========================
// REVIEW
// ==========================

export interface IReview {
  id: string;
  bookingId?: string | null;
  reviewerId?: string | null;
  revieweeId?: string | null;
  rating: number;
  createdAt: Date;
  updatedAt: Date;

  reviewer?: IUser | null;
  reviewee?: IUser | null;

  listingId: string;
  listing?: IListing;
}

// ==========================
// TOKEN
// ==========================

export interface IToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;

  user?: IUser;
}

export interface IPrisma {
    user: IUser,
    listing: IListing,
    booking: IBooking,
    messaging: IMessage,
    review: IReview,
    token: IToken
}
