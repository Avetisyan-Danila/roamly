import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { PropertyStatus } from '../../generated/prisma/enums.js';
import {
  PropertyNotDraftException,
  PropertyNotPublishedException,
} from '../../common/errors/exceptions.js';

@Injectable()
export class PropertyAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOwner(
    propertyId: string,
    userId: string,
    expectedStatus?: PropertyStatus,
  ): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        ownerId: true,
        status: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this property',
      );
    }

    if (expectedStatus && property.status !== expectedStatus) {
      throw expectedStatus === PropertyStatus.DRAFT
        ? new PropertyNotDraftException()
        : new PropertyNotPublishedException();
    }
  }
}
