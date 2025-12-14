

export interface IMessage {
    _id: string;
    fromUserId: string;
    toUserId: string;
    listingId?: string;
    content: string;
    timestamp: Date;
}
