import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaMembership } from '../../modules/areas/entities/area-membership.entity';
import { Area } from '../../modules/areas/entities/area.entity';

/**
 * Verifies that:
 *   1. The Area exists and is active
 *   2. The authenticated user is an active member of that Area
 *
 * Reads :areaId from route params.
 * Attaches area + membership to req for downstream handlers.
 */
@Injectable()
export class AreaMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(AreaMembership)
    private readonly membershipRepo: Repository<AreaMembership>,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.id;
    const areaId: string = req.params?.areaId;

    if (!areaId) return true; // not an area-scoped route

    const area = await this.areaRepo.findOne({
      where: { id: areaId, isActive: true },
    });

    if (!area) throw new NotFoundException(`Area ${areaId} not found.`);

    const membership = await this.membershipRepo.findOne({
      where: { areaId, userId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this Area.');
    }

    req.area = area;
    req.membership = membership;
    return true;
  }
}
