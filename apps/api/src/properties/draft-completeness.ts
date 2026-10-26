import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import type { Property } from '../generated/prisma/client.js';

import { CreatePropertyDto } from './dto/create-property.dto.js';

type PropertyField = Exclude<keyof CreatePropertyDto, 'amenityIds'>;

export type DraftRequirement = PropertyField | 'amenities' | 'photos';

export function getMissingRequirements(
  property: Property,
  photoCount: number,
): DraftRequirement[] {
  const propertyData = plainToInstance(CreatePropertyDto, {
    title: property.title,
    description: property.description,
    country: property.country,
    city: property.city,
    address: property.address,
    latitude: property.latitude?.toNumber(),
    longitude: property.longitude?.toNumber(),
    pricePerNight: property.pricePerNight?.toFixed(2),
    currency: property.currency,
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    beds: property.beds,
    bathrooms: property.bathrooms?.toNumber(),
  });

  const missing: DraftRequirement[] = validateSync(propertyData).map(
    (error) => error.property as PropertyField,
  );

  if (property.amenitiesConfirmedAt === null) {
    missing.push('amenities');
  }

  if (photoCount === 0) {
    missing.push('photos');
  }

  return missing;
}
