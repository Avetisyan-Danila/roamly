import { STATUS_CODES } from 'node:http';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';

import type { ErrorCode } from '../errors/error-code.js';
import type { ErrorResponseDto } from '../errors/error-response.dto.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = this.toResponseBody(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      body.requestId = String(request.id);
      response.err =
        exception instanceof Error ? exception : new Error(String(exception));
    }

    httpAdapter.reply(response, body, body.statusCode);
  }

  private toResponseBody(exception: unknown): ErrorResponseDto {
    if (!(exception instanceof HttpException)) {
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
