import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { PropertyAuthorizationService } from './authorization/property-authorization.service.js';
import { StorageService } from '../storage/storage.service.js';
import { PropertyStatus } from '../generated/prisma/enums.js';
import { PropertyMapper } from './mappers/property.mapper.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { DraftPropertyResponseDto } from './dto/draft-property-response.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreatePhotoUploadUrlDto } from './dto/create-photo-upload-url.dto.js';
import { randomUUID } from 'node:crypto';
import { processPropertyPhoto } from './photos/process-property-photo.js';
import { PHOTO_CLEANUP_GRACE_PERIOD_MS } from './photos/photo-cleanup.constants.js';
import { plainToInstance } from 'class-transformer';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { validateSync } from 'class-validator';

function isTransactionWriteConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }

  if (!(error instanceof Error) || error.name !== 'DriverAdapterError') {
    return false;
  }

  const cause = error.cause;

  return (
    typeof cause === 'object' &&
    cause !== null &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict'
  );
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAuthorizationService: PropertyAuthorizationService,
    private readonly storageService: StorageService,
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

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const property = await tx.property.findFirst({
            where: {
              id,
              ownerId,
            },
            select: {
              propertyPhotos: {
                select: { storageKey: true },
              },
              photoUploads: {
                select: {
                  storageKey: true,
                  expiresAt: true,
                },
              },
            },
          });

          if (!property) {
            throw new ConflictException('Property no longer exists');
          }

          const deletionTasks = [
            ...property.propertyPhotos.map((photo) => ({
              storageKey: photo.storageKey,
              availableAt: new Date(),
            })),

            ...property.photoUploads.map((upload) => ({
              storageKey: upload.storageKey,
              availableAt: new Date(
                upload.expiresAt.getTime() + PHOTO_CLEANUP_GRACE_PERIOD_MS,
              ),
            })),
          ];

          if (deletionTasks.length > 0) {
            await tx.storageDeletionTask.createMany({
              data: deletionTasks,
            });
          }

          await tx.property.delete({
            where: { id },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isTransactionWriteConflict(error)) {
        throw new ConflictException('Concurrent property change, please retry');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Property no longer exists');
      }

      throw error;
    }
  }

  async publish(id: string, ownerId: string): Promise<PropertyResponseDto> {
    await this.propertyAuthorizationService.ensureOwner(
      id,
      ownerId,
      PropertyStatus.DRAFT,
    );

    try {
      const property = await this.prisma.$transaction(
        async (tx) => {
          const draft = await tx.property.findFirst({
            where: {
              id,
              ownerId,
              status: PropertyStatus.DRAFT,
            },
            include: {
              amenities: true,
            },
          });

          if (!draft) {
            throw new ConflictException('Property is no longer a draft');
          }

          const propertyData = plainToInstance(CreatePropertyDto, {
            title: draft.title,
            description: draft.description,
            country: draft.country,
            city: draft.city,
            address: draft.address,
            latitude: draft.latitude?.toNumber(),
            longitude: draft.longitude?.toNumber(),
            pricePerNight: draft.pricePerNight?.toFixed(2),
            currency: draft.currency,
            maxGuests: draft.maxGuests,
            bedrooms: draft.bedrooms,
            beds: draft.beds,
            bathrooms: draft.bathrooms?.toNumber(),
          });

          const errors = validateSync(propertyData);

          if (errors.length > 0) {
            throw new UnprocessableEntityException({
              message: 'Property has incomplete or invalid fields',
              invalidFields: errors.map((error) => error.property),
            });
          }

          const photoCount = await tx.propertyPhoto.count({
            where: { propertyId: id },
          });

          if (photoCount === 0) {
            throw new UnprocessableEntityException(
              'At least one confirmed photo is required',
            );
          }

          return tx.property.update({
            where: {
              id,
              ownerId,
              status: PropertyStatus.DRAFT,
            },
            data: {
              status: PropertyStatus.PUBLISHED,
            },
            include: {
              amenities: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return PropertyMapper.toPublishedResponse(property);
    } catch (error) {
      if (isTransactionWriteConflict(error)) {
        throw new ConflictException('Concurrent property change, please retry');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Property is no longer a draft');
      }

      throw error;
    }
  }

  async createPhotoUploadUrl(
    propertyId: string,
    ownerId: string,
    dto: CreatePhotoUploadUrlDto,
  ): Promise<{ uploadId: string; uploadUrl: string }> {
    await this.propertyAuthorizationService.ensureOwner(
      propertyId,
      ownerId,
      PropertyStatus.DRAFT,
    );

    const photoCount = await this.prisma.propertyPhoto.count({
      where: { propertyId },
    });

    if (photoCount >= 10) {
      throw new ConflictException('Maximum 10 photos allowed');
    }

    const storageKey = `properties/${propertyId}/pending/${randomUUID()}`;

    const uploadUrl = await this.storageService.createUploadUrl(
      storageKey,
      dto.contentType,
    );

    const upload = await this.prisma.propertyPhotoUpload.create({
      data: {
        propertyId,
        storageKey,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return {
      uploadId: upload.id,
      uploadUrl,
    };
  }

  async confirmPhotoUpload(
    propertyId: string,
    ownerId: string,
    uploadId: string,
  ): Promise<{ id: string }> {
    await this.propertyAuthorizationService.ensureOwner(
      propertyId,
      ownerId,
      PropertyStatus.DRAFT,
    );

    const upload = await this.prisma.propertyPhotoUpload.findFirst({
      where: {
        id: uploadId,
        propertyId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!upload) {
      throw new NotFoundException('Photo upload not found or expired');
    }

    const original = await this.storageService.readPhotoForValidation(
      upload.storageKey,
    );

    if (
      original.sizeBytes !== upload.sizeBytes ||
      original.contentType !== upload.contentType
    ) {
      throw new UnprocessableEntityException(
        'Uploaded photo does not match the requested file',
      );
    }

    const processed = await processPropertyPhoto(
      original.buffer,
      upload.contentType,
    );

    if (processed.length > 10 * 1024 * 1024) {
      throw new UnprocessableEntityException('Processed photo is too large');
    }

    const permanentStorageKey = `properties/${propertyId}/photos/${randomUUID()}.webp`;

    try {
      await this.storageService.saveProcessedPhoto(
        permanentStorageKey,
        processed,
      );

      const photo = await this.prisma.$transaction(
        async (tx) => {
          const result = await tx.propertyPhotoUpload.deleteMany({
            where: {
              id: uploadId,
              propertyId,
              expiresAt: { gt: new Date() },
            },
          });

          if (result.count !== 1) {
            throw new ConflictException(
              'Photo upload already confirmed or expired',
            );
          }

          const draft = await tx.property.findFirst({
            where: {
              id: propertyId,
              ownerId,
              status: PropertyStatus.DRAFT,
            },
            select: { id: true },
          });

          if (!draft) {
            throw new ConflictException('Property is no longer a draft');
          }

          const photoCount = await tx.propertyPhoto.count({
            where: { propertyId },
          });

          if (photoCount >= 10) {
            throw new ConflictException('Maximum 10 photos allowed');
          }

          const photo = await tx.propertyPhoto.create({
            data: {
              propertyId,
              storageKey: permanentStorageKey,
              contentType: 'image/webp',
              sizeBytes: processed.length,
              position: photoCount,
            },
          });

          await tx.storageDeletionTask.create({
            data: {
              storageKey: upload.storageKey,
              availableAt: new Date(
                upload.expiresAt.getTime() + PHOTO_CLEANUP_GRACE_PERIOD_MS,
              ),
            },
          });

          return photo;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return { id: photo.id };
    } catch (error) {
      try {
        await this.storageService.deleteObject(permanentStorageKey);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to clean up photo ${permanentStorageKey}`,
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }

      if (isTransactionWriteConflict(error)) {
        throw new ConflictException(
          'Concurrent photo confirmation, please retry',
        );
      }

      throw error;
    }
  }

  async listDraftPhotos(
    propertyId: string,
    ownerId: string,
  ): Promise<{ id: string; url: string; position: number }[]> {
    await this.propertyAuthorizationService.ensureOwner(
      propertyId,
      ownerId,
      PropertyStatus.DRAFT,
    );

    const photos = await this.prisma.propertyPhoto.findMany({
      where: { propertyId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        storageKey: true,
        position: true,
      },
    });

    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        position: photo.position,
        url: await this.storageService.createDownloadUrl(photo.storageKey),
      })),
    );
  }

  async removeDraftPhoto(
    propertyId: string,
    ownerId: string,
    photoId: string,
  ): Promise<void> {
    await this.propertyAuthorizationService.ensureOwner(
      propertyId,
      ownerId,
      PropertyStatus.DRAFT,
    );

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const draft = await tx.property.findFirst({
            where: {
              id: propertyId,
              ownerId,
              status: PropertyStatus.DRAFT,
            },
            select: { id: true },
          });

          if (!draft) {
            throw new ConflictException('Property is no longer a draft');
          }

          const photo = await tx.propertyPhoto.findFirst({
            where: {
              id: photoId,
              propertyId,
            },
            select: {
              storageKey: true,
              position: true,
            },
          });

          if (!photo) {
            throw new NotFoundException('Property photo not found');
          }

          await tx.storageDeletionTask.create({
            data: {
              storageKey: photo.storageKey,
              availableAt: new Date(),
            },
          });

          await tx.propertyPhoto.delete({
            where: { id: photoId },
          });

          await tx.propertyPhoto.updateMany({
            where: {
              propertyId,
              position: { gt: photo.position },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (isTransactionWriteConflict(error)) {
        throw new ConflictException('Concurrent photo change, please retry');
      }

      throw error;
    }
  }
}
