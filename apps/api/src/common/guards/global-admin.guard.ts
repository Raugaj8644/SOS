import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GlobalRole } from '../../modules/users/entities/user.entity';

/** Email addresses that always have global admin access */
const GLOBAL_ADMIN_EMAILS = new Set(['jagauer8644@gmail.com']);

/**
 * Guard: passes only if the authenticated user is a platform-level admin.
 * A user qualifies if:
 *   - Their email is in GLOBAL_ADMIN_EMAILS, OR
 *   - Their role is GlobalRole.SUPER_ADMIN
 */
@Injectable()
export class GlobalAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Not authenticated.');

    const isAdmin =
      GLOBAL_ADMIN_EMAILS.has(user.email) ||
      user.role === GlobalRole.SUPER_ADMIN;

    if (!isAdmin) {
      throw new ForbiddenException('Global admin access required.');
    }
    return true;
  }
}
