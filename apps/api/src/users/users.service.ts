import { Injectable, NotFoundException } from '@nestjs/common';
import { UserMapper } from './mappers/user.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserResponseDto } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return UserMapper.toResponse(user);
  }
}
