import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER_NAME = 'x-csrf-protection';
const CSRF_HEADER_VALUE = 'enabled';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const csrfHeader = request.headers[CSRF_HEADER_NAME];

    if (csrfHeader !== CSRF_HEADER_VALUE) {
      throw new ForbiddenException('Invalid CSRF protection header');
    }

    return true;
  }
}
