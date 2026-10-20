import { STATUS_CODES } from 'node:http';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import type { ErrorCode } from '../errors/error-code.js';
import type { ErrorResponseDto } from '../errors/error-response.dto.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const body = this.toResponseBody(exception);

    httpAdapter.reply(host.switchToHttp().getResponse(), body, body.statusCode);
  }

  private toResponseBody(exception: unknown): ErrorResponseDto {
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR] ?? 'Error',
        message: 'Internal server error',
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    const details =
      typeof response === 'string' ? { message: response } : response;

    const body: ErrorResponseDto = {
      message: exception.message,
      ...details,
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
    };

    if (exception.errorCode) {
      body.errorCode = exception.errorCode as ErrorCode;
    }

    return body;
  }
}
