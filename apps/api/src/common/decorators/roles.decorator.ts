import { SetMetadata } from '@nestjs/common';
import { AreaRole } from '../../modules/areas/entities/area-membership.entity';

export const ROLES_KEY = 'roles';

/** Restrict handler to specific Area roles (admin|user). */
export const Roles = (...roles: AreaRole[]) => SetMetadata(ROLES_KEY, roles);
