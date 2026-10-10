import { IsIn, IsInt, Max, Min } from 'class-validator';

export class CreatePhotoUploadUrlDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}
