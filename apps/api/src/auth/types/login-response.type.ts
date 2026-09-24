import type { UserResponseDto } from '../../users/dto/user-response.dto.js';

export type LoginResponse = {
  accessToken: string;
  user: UserResponseDto;
};
