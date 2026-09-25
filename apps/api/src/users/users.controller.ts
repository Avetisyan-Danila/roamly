import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findById(currentUser.userId);
  }
}
