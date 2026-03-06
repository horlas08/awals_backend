

export interface IMessage {
    _id: string;
    fromUserId: string;
    toUserId: string;
    listingId?: string;
    bookingId?: string;
    content: string;
    timestamp: Date;
}
