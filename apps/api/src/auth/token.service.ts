import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload } from './types/access-token-payload.type.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

type JwtDuration = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createAccessToken(userId: string): Promise<string> {
    const expiresIn =
      this.configService.getOrThrow<JwtDuration>('JWT_ACCESS_TTL');

    const payload: AccessTokenPayload = {
      sub: userId,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn,
    });
  }

  createRefreshSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  buildRefreshToken(sessionId: string, secret: string): string {
    return `${sessionId}.${secret}`;
  }

  parseRefreshToken(
    token: string,
  ): { sessionId: string; secret: string } | null {
    const [sessionId, secret, extraPart] = token.split('.');

    if (!sessionId || !secret || extraPart) {
      return null;
    }

    return {
      sessionId,
      secret,
    };
  }

  verifyRefreshSecret(secret: string, expectedHash: string): boolean {
    const actualHash = this.hashRefreshSecret(secret);

    const actualBuffer = Buffer.from(actualHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }
}
