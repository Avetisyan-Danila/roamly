import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { UserMapper } from '../users/mappers/user.mapper.js';
import { Prisma } from '../generated/prisma/client.js';
import { TokenService } from './token.service.js';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginResult } from './types/login-result.type.js';
import { RefreshResult } from './types/refresh-result.type.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      });

      return UserMapper.toResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.tokenService.createAccessToken(user.id);

    const refreshSecret = this.tokenService.createRefreshSecret();
    const refreshTokenHash = this.tokenService.hashRefreshSecret(refreshSecret);

    const refreshTokenTtlDays = this.configService.getOrThrow<number>(
      'REFRESH_TOKEN_TTL_DAYS',
    );

    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      },
    });

    const refreshToken = this.tokenService.buildRefreshToken(
      session.id,
      refreshSecret,
    );

    return {
      accessToken,
      refreshToken,
      user: UserMapper.toResponse(user),
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const parsedToken = this.tokenService.parseRefreshToken(refreshToken);

    if (!parsedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.authSession.findUnique({
      where: {
        id: parsedToken.sessionId,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();

    if (session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const secretMatches = this.tokenService.verifyRefreshSecret(
      parsedToken.secret,
      session.refreshTokenHash,
    );

    if (!secretMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newRefreshSecret = this.tokenService.createRefreshSecret();

    const newRefreshTokenHash =
      this.tokenService.hashRefreshSecret(newRefreshSecret);

    const newRefreshToken = this.tokenService.buildRefreshToken(
      session.id,
      newRefreshSecret,
    );

    const accessToken = await this.tokenService.createAccessToken(
      session.userId,
    );

    const updateResult = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: now,
      },
    });

    if (updateResult.count !== 1) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const parsedToken = this.tokenService.parseRefreshToken(refreshToken);

    if (!parsedToken) {
      return;
    }

    const session = await this.prisma.authSession.findUnique({
      where: {
        id: parsedToken.sessionId,
      },
    });

    if (!session) {
      return;
    }

    const secretMatches = this.tokenService.verifyRefreshSecret(
      parsedToken.secret,
      session.refreshTokenHash,
    );

    if (!secretMatches) {
      return;
    }

    await this.prisma.authSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
