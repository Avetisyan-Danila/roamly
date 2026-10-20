import { ErrorCode } from './error-code.js';

export class ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode?: ErrorCode;
  invalidFields?: string[];
  missingAmenityIds?: string[];
}
