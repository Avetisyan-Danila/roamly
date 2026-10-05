import { Amenity } from '../../generated/prisma/client.js';
import { AmenityResponseDto } from '../dto/amenity-response.dto.js';

export class AmenityMapper {
  static toResponse(amenity: Amenity): AmenityResponseDto {
    return {
      id: amenity.id,
      code: amenity.code,
      name: amenity.name,
    };
  }
}
