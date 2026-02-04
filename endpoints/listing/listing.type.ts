

export interface IListing {
  _id: string;
  hostId: string;
  name: string;
  description: string;
  // location: {
  //   address: string;
  //   coordinates: { lat: number; lng: number; }
  // };
  lat: number; lng: number;
  address: string;
  images: string[];
  pricePerNight: string;
  country?: string;
  category?: string;
  rating?: number;
  amenities: string[];
  rules: string;
  cancellationPolicy: string;
  // calendar: IAvailability[];
  calendar: IAvailability;
  deleted: boolean,
  createdAt: Date;
  updatedAt: Date;
}

interface IAvailability {
  date: string;
  isBooked: boolean;
}
