import { PropertyResponseDto } from './property-response.dto.js';

export class PropertyDetailsResponseDto extends PropertyResponseDto {
  photos: {
    id: string;
    url: string;
    position: number;
  }[];
}
