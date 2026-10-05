import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AmenityResponseDto } from './dto/amenity-response.dto.js';
import { AmenityMapper } from './mappers/amenity.mapper.js';

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AmenityResponseDto[]> {
    const amenities = await this.prisma.amenity.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return amenities.map(AmenityMapper.toResponse);
  }
}
