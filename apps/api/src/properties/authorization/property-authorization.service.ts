import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PropertyAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOwner(propertyId: string, userId: string): Promise<void> {
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

    if (property.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this property',
      );
    }
  }
}
