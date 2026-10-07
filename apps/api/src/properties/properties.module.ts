import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { PropertyAuthorizationService } from './authorization/property-authorization.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyAuthorizationService],
})
export class PropertiesModule {}
