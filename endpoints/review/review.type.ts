

export interface IReview {
  _id: string;
  bookingId: string;
  reviewerId: string;  
  revieweeId: string;  
  rating: number;        
  comment: string;
  createdAt: Date;
}
