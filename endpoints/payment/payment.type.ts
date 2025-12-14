
export type TPaymentStatus = 'pending' | 'paid' | 'refunded';

export interface IPayment {
    _id: string;
    bookingId: string;
    paymentProvider: string;
    paymentStatus: TPaymentStatus;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}
