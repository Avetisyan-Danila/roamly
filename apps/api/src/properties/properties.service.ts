import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { PropertyStatus } from '../generated/prisma/enums.js';
import { PropertyAuthorizationService } from './authorization/property-authorization.service.js';
import { PropertyMapper } from './mappers/property.mapper.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { DraftPropertyResponseDto } from './dto/draft-property-response.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAuthorizationService: PropertyAuthorizationService,
  ) {}

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

  async createDraft(ownerId: string): Promise<DraftPropertyResponseDto> {
    const property = await this.prisma.property.create({
      data: {
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
      include: {
        amenities: true,
      },
    });

    return PropertyMapper.toDraftResponse(property);
  }

  async findDraft(
    id: string,
    ownerId: string,
  ): Promise<DraftPropertyResponseDto> {
    const property = await this.prisma.property.findFirst({
      where: {
        id,
        ownerId,
        status: PropertyStatus.DRAFT,
      },
      include: {
        amenities: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Draft property not found');
    }

    return PropertyMapper.toDraftResponse(property);
  }

  async findOne(id: string): Promise<PropertyResponseDto> {
    const property = await this.prisma.property.findFirst({
      where: {
        id,
        status: PropertyStatus.PUBLISHED,
      },
      include: {
        amenities: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return PropertyMapper.toPublishedResponse(property);
  }

  async updateDraft(
    id: string,
    ownerId: string,
    dto: UpdatePropertyDto,
  ): Promise<DraftPropertyResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one property field must be provided',
      );
    }

    await this.propertyAuthorizationService.ensureOwner(
      id,
      ownerId,
      PropertyStatus.DRAFT,
    );

    const { amenityIds, ...propertyData } = dto;

    if (amenityIds === null) {
      throw new BadRequestException('amenityIds must be an array');
    }

    if (amenityIds !== undefined) {
      await this.validateAmenityIds(amenityIds);
    }

    try {
      const property = await this.prisma.property.update({
        where: {
          id,
          status: PropertyStatus.DRAFT,
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

      return PropertyMapper.toDraftResponse(property);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Property is no longer a draft');
      }

      throw error;
    }
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

    await this.propertyAuthorizationService.ensureOwner(
      id,
      ownerId,
      PropertyStatus.PUBLISHED,
    );

    const { amenityIds, ...propertyData } = dto;

    if (
      amenityIds === null ||
      Object.values(propertyData).some((value) => value === null)
    ) {
      throw new BadRequestException('Published property fields cannot be null');
    }

    if (amenityIds !== undefined) {
      await this.validateAmenityIds(amenityIds);
    }

    try {
      const property = await this.prisma.property.update({
        where: {
          id,
          status: PropertyStatus.PUBLISHED,
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

      return PropertyMapper.toPublishedResponse(property);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Property is no longer published');
      }

      throw error;
    }
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.propertyAuthorizationService.ensureOwner(id, ownerId);

    await this.prisma.property.delete({
      where: {
        id,
      },
    });
  }
}
