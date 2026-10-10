import { UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';

const MAX_INPUT_PIXELS = 25_000_000;

const CONTENT_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function processPropertyPhoto(
  buffer: Buffer,
  expectedContentType: string,
): Promise<Buffer> {
  try {
    const image = sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'warning',
    });

    const metadata = await image.metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) !== 1 ||
      CONTENT_TYPES[metadata.format] !== expectedContentType
    ) {
      throw new Error('Unsupported image');
    }

    return await image
      .autoOrient()
      .resize({
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UnprocessableEntityException('Invalid or unsupported photo');
  }
}
