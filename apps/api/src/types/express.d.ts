import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};
