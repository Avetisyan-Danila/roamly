import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

import { ACCESS_TOKEN_COOKIE_NAME } from '../auth/auth.constants.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { CSRF_HEADER_NAME, SAFE_METHODS } from '../common/guards/csrf.guard.js';

const COOKIE_AUTH = 'cookieAuth';
const CSRF = 'csrf';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch'] as const;

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Roamly API')
    .setVersion('1.0')
    .addCookieAuth(ACCESS_TOKEN_COOKIE_NAME, undefined, COOKIE_AUTH)
    .addApiKey({ type: 'apiKey', in: 'header', name: CSRF_HEADER_NAME }, CSRF)
    .addSecurityRequirements(COOKIE_AUTH)
    .addGlobalResponse({
      status: 'default',
      description: 'Error',
      type: ErrorResponseDto,
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  requireCsrfOnUnsafeMethods(document);

  return document;
}

// Mirrors CsrfGuard: the requirement depends on the HTTP method, not on decorators
function requireCsrfOnUnsafeMethods(document: OpenAPIObject): void {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];

      if (!operation || SAFE_METHODS.has(method.toUpperCase())) {
        continue;
      }

      const requirements = operation.security ?? document.security ?? [{}];

      operation.security = requirements.map((requirement) => ({
        ...requirement,
        [CSRF]: [],
      }));
    }
  }
}
