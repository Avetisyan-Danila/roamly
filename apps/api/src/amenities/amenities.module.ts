import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AmenitiesController } from './amenities.controller.js';
import { AmenitiesService } from './amenities.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AmenitiesController],
  providers: [AmenitiesService],
})
export class AmenitiesModule {}
