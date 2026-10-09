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
import { PropertyResponseDto } from './dto/property-response.dto.js';
import { PropertiesService } from './properties.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { UpdatePropertyDto } from './dto/update-property.dto.js';
import { DraftPropertyResponseDto } from './dto/draft-property-response.dto.js';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post('drafts')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DraftPropertyResponseDto> {
    return this.propertiesService.createDraft(user.userId);
  }

  @Get('drafts/:id')
  findDraft(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DraftPropertyResponseDto> {
    return this.propertiesService.findDraft(id, user.userId);
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.findOne(id);
  }

  @Patch('drafts/:id')
  updateDraft(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePropertyDto,
  ): Promise<DraftPropertyResponseDto> {
    return this.propertiesService.updateDraft(id, user.userId, dto);
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
