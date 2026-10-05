import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { PropertiesService } from './properties.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.create(user.userId, dto);
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.propertiesService.remove(id, user.userId);
  }
}
