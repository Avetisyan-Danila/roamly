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
import { CreatePhotoUploadUrlDto } from './dto/create-photo-upload-url.dto.js';
import { PropertyDetailsResponseDto } from './dto/property-details-response.dto.js';
import { PhotoUploadUrlResponseDto } from './dto/photo-upload-url-response.dto.js';
import { ConfirmedPhotoResponseDto } from './dto/confirmed-photo-response.dto.js';
import { PropertyPhotoResponseDto } from './dto/property-photo-response.dto.js';

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

  @Patch('drafts/:id')
  updateDraft(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePropertyDto,
  ): Promise<DraftPropertyResponseDto> {
    return this.propertiesService.updateDraft(id, user.userId, dto);
  }

  @Post('drafts/:id/photos/upload-url')
  createPhotoUploadUrl(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePhotoUploadUrlDto,
  ): Promise<PhotoUploadUrlResponseDto> {
    return this.propertiesService.createPhotoUploadUrl(id, user.userId, dto);
  }

  @Post('drafts/:id/photos/:uploadId/confirm')
  confirmPhotoUpload(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('uploadId', new ParseUUIDPipe({ version: '4' })) uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConfirmedPhotoResponseDto> {
    return this.propertiesService.confirmPhotoUpload(id, user.userId, uploadId);
  }

  @Get('drafts/:id/photos')
  listDraftPhotos(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PropertyPhotoResponseDto[]> {
    return this.propertiesService.listDraftPhotos(id, user.userId);
  }

  @Delete('drafts/:id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDraftPhoto(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.propertiesService.removeDraftPhoto(id, user.userId, photoId);
  }

  @Public()
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PropertyDetailsResponseDto> {
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

  @Post(':id/publish')
  publish(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PropertyResponseDto> {
    return this.propertiesService.publish(id, user.userId);
  }
}
