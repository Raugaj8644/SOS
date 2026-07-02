import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AreaMembership, AreaRole } from '../../modules/areas/entities/area-membership.entity';

/**
 * Checks that the authenticated user holds one of the required AreaRoles
 * inside the Area specified by :areaId in the route params.
 *
 * Must be used after JwtAuthGuard.
 * Attach required roles with: @Roles(AreaRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AreaMembership)
    private readonly membershipRepo: Repository<AreaMembership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AreaRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles decorator — allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.id;
    const areaId: string = req.params?.areaId;

    if (!areaId) return true; // non-area route, skip

    const membership = await this.membershipRepo.findOne({
      where: { userId, areaId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this Area.');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `This action requires one of: [${requiredRoles.join(', ')}]`,
      );
    }

    // Attach membership to request for downstream use
    req.membership = membership;
    return true;
  }
}
