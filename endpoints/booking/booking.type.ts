export type TBookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface IBooking {
    _id: string;
    listingId?: string | null;
    serviceListingId?: string | null;
    experienceListingId?: string | null;
    guestId: string;
    startDate: Date;
    endDate: Date;
    totalPrice: number;
    status: TBookingStatus;
    createdAt: Date;
}
