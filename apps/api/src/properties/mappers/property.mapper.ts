import { AmenityMapper } from '../../amenities/mappers/amenity.mapper.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PropertyResponseDto } from '../dto/property-response.dto.js';

type PropertyWithAmenities = Prisma.PropertyGetPayload<{
  include: {
    amenities: true;
  };
}>;

export class PropertyMapper {
  static toResponse(property: PropertyWithAmenities): PropertyResponseDto {
    return {
      id: property.id,
      ownerId: property.ownerId,
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
}
