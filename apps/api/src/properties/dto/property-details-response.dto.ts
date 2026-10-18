import { PropertyPhotoResponseDto } from './property-photo-response.dto.js';
import { PropertyResponseDto } from './property-response.dto.js';

export class PropertyDetailsResponseDto extends PropertyResponseDto {
  photos: PropertyPhotoResponseDto[];
}
