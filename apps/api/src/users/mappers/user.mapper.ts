import type { UserModel } from '../../generated/prisma/models/User.js';
import type { UserResponseDto } from '../dto/user-response.dto.js';

export class UserMapper {
  static toResponse(user: UserModel): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
