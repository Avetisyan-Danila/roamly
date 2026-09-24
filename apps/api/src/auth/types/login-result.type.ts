import type { UserResponseDto } from '../../users/dto/user-response.dto.js';

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
};
