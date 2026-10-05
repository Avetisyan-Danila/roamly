import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/decorators/public.decorator.js';
import { AmenityResponseDto } from './dto/amenity-response.dto.js';
import { AmenitiesService } from './amenities.service.js';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Public()
  @Get()
  findAll(): Promise<AmenityResponseDto[]> {
    return this.amenitiesService.findAll();
  }
}
