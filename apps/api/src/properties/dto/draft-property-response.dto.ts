import { Currency } from '../../generated/prisma/enums.js';
import { AmenityResponseDto } from '../../amenities/dto/amenity-response.dto.js';
import type { DraftRequirement } from '../draft-completeness.js';

export class DraftPropertyResponseDto {
  id: string;
  ownerId: string;
  status: 'DRAFT';
  title: string | null;
  description: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  pricePerNight: string | null;
  currency: Currency | null;
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: AmenityResponseDto[];
  missingRequirements: DraftRequirement[];
  createdAt: Date;
  updatedAt: Date;
}
