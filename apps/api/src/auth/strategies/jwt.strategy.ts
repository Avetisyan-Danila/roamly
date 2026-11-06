import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { PinoLogger } from 'nestjs-pino';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN_COOKIE_NAME } from '../auth.constants.js';

import type { Request } from 'express';
import type { AccessTokenPayload } from '../types/access-token-payload.type.js';
import type { Env } from '../../config/env.validation.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<Env, true>,
    private readonly logger: PinoLogger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request.cookies?.[ACCESS_TOKEN_COOKIE_NAME] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET', {
        infer: true,
      }),
    });
  }

  validate(payload: AccessTokenPayload) {
    this.logger.assign({ userId: payload.sub });

    return {
      userId: payload.sub,
    };
  }
}
