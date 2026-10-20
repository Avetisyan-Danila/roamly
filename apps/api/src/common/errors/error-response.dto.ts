import { ApiProperty } from '@nestjs/swagger';

import { ErrorCode } from './error-code.js';

export class ErrorResponseDto {
  statusCode: number;
  error: string;

  // The plugin cannot infer unions: ValidationPipe sends an array of messages
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  errorCode?: ErrorCode;
  invalidFields?: string[];
  missingAmenityIds?: string[];
}
