import { Currency } from '../../generated/prisma/enums.js';
import { AmenityResponseDto } from '../../amenities/dto/amenity-response.dto.js';

export class PropertyResponseDto {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  country: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerNight: string;
  currency: Currency;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: AmenityResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
