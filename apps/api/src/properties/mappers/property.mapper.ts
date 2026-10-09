import { InternalServerErrorException } from '@nestjs/common';

import { AmenityMapper } from '../../amenities/mappers/amenity.mapper.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PropertyStatus } from '../../generated/prisma/enums.js';

import { DraftPropertyResponseDto } from '../dto/draft-property-response.dto.js';
import { PropertyResponseDto } from '../dto/property-response.dto.js';

type PropertyWithAmenities = Prisma.PropertyGetPayload<{
  include: {
    amenities: true;
  };
}>;

export class PropertyMapper {
  static toPublishedResponse(
    property: PropertyWithAmenities,
  ): PropertyResponseDto {
    if (
      property.status !== PropertyStatus.PUBLISHED ||
      property.title === null ||
      property.description === null ||
      property.country === null ||
      property.city === null ||
      property.address === null ||
      property.latitude === null ||
      property.longitude === null ||
      property.pricePerNight === null ||
      property.currency === null ||
      property.maxGuests === null ||
      property.bedrooms === null ||
      property.beds === null ||
      property.bathrooms === null
    ) {
      throw new InternalServerErrorException(
        'Published property has incomplete data',
      );
    }

    return {
      id: property.id,
      ownerId: property.ownerId,
      status: property.status,
      title: property.title,
      description: property.description,
      country: property.country,
      city: property.city,
      address: property.address,
      latitude: property.latitude.toNumber(),
      longitude: property.longitude.toNumber(),
      pricePerNight: property.pricePerNight.toFixed(2),
      currency: property.currency,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      beds: property.beds,
      bathrooms: property.bathrooms.toNumber(),
      amenities: property.amenities.map(AmenityMapper.toResponse),
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  static toDraftResponse(
    property: PropertyWithAmenities,
  ): DraftPropertyResponseDto {
    if (property.status !== PropertyStatus.DRAFT) {
      throw new InternalServerErrorException('Expected a draft property');
    }

    return {
      id: property.id,
      ownerId: property.ownerId,
      status: property.status,
      title: property.title,
      description: property.description,
      country: property.country,
      city: property.city,
      address: property.address,
      latitude: property.latitude?.toNumber() ?? null,
      longitude: property.longitude?.toNumber() ?? null,
      pricePerNight: property.pricePerNight?.toFixed(2) ?? null,
      currency: property.currency,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      beds: property.beds,
      bathrooms: property.bathrooms?.toNumber() ?? null,
      amenities: property.amenities.map(AmenityMapper.toResponse),
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
