import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { PropertyMapper } from './mappers/property.mapper.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateAmenityIds(amenityIds: string[]): Promise<void> {
    if (amenityIds.length === 0) {
      return;
    }

    const existingAmenities = await this.prisma.amenity.findMany({
      where: {
        id: {
          in: amenityIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingAmenities.length === amenityIds.length) {
      return;
    }

    const existingIds = new Set(existingAmenities.map((amenity) => amenity.id));

    const missingAmenityIds = amenityIds.filter((id) => !existingIds.has(id));

    throw new BadRequestException({
      message: 'One or more amenities do not exist',
      missingAmenityIds,
    });
  }

  private async ensureOwnership(
    propertyId: string,
    ownerId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: {
        ownerId: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to modify this property',
      );
    }
  }

  async create(
    ownerId: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const { amenityIds = [], ...propertyData } = dto;

    await this.validateAmenityIds(amenityIds);

    const property = await this.prisma.property.create({
      data: {
        ...propertyData,

        owner: {
          connect: {
            id: ownerId,
          },
        },

        amenities: {
          connect: amenityIds.map((id) => ({ id })),
        },
      },

      include: {
        amenities: true,
      },
    });

    return PropertyMapper.toResponse(property);
  }

  async findOne(id: string): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findUnique({
      where: {
        id,
      },
      include: {
        amenities: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return PropertyMapper.toResponse(property);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one property field must be provided',
      );
    }

    await this.ensureOwnership(id, ownerId);

    const { amenityIds, ...propertyData } = dto;

    if (amenityIds !== undefined) {
      await this.validateAmenityIds(amenityIds);
    }

    const updatedProperty = await this.prisma.property.update({
      where: {
        id,
      },
      data: {
        ...propertyData,

        ...(amenityIds !== undefined
          ? {
              amenities: {
                set: amenityIds.map((amenityId) => ({
                  id: amenityId,
                })),
              },
            }
          : {}),
      },
      include: {
        amenities: true,
      },
    });

    return PropertyMapper.toResponse(updatedProperty);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.ensureOwnership(id, ownerId);

    await this.prisma.property.delete({
      where: {
        id,
      },
    });
  }
}
