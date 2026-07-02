import {
  CanActivate, ExecutionContext, Injectable,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

/**
 * Spam Guard — prevents incident spam from a single user within an Area.
 *
 * Rules:
 * - Max 3 incidents per user per Area per 10 minutes
 * - Max 10 incidents per user globally per hour
 *
 * Applied on: POST /areas/:areaId/incidents
 */
@Injectable()
export class SpamGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req    = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    const areaId = req.params?.areaId;

    if (!userId) return true; // JWT guard handles auth

    const now       = Date.now();
    const tenMinAgo = now - 10 * 60 * 1000;
    const oneHrAgo  = now - 60 * 60 * 1000;

    // Per-area sliding window
    const areaKey  = `spam:area:${userId}:${areaId}`;
    const globalKey = `spam:global:${userId}`;

    const [areaCount, globalCount] = await Promise.all([
      this.countWindow(areaKey, tenMinAgo, now),
      this.countWindow(globalKey, oneHrAgo, now),
    ]);

    if (areaCount >= 3) {
      throw new HttpException(
        { success: false, message: 'Too many incidents reported in this Area. Please wait 10 minutes.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (globalCount >= 10) {
      throw new HttpException(
        { success: false, message: 'Hourly incident report limit reached. Please wait before reporting again.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Record this request
    const score = now;
    const member = `${now}-${Math.random()}`;
    await Promise.all([
      this.redis.pipeline()
        .zadd(areaKey, score, member)
        .pexpire(areaKey, 10 * 60 * 1000)
        .exec(),
      this.redis.pipeline()
        .zadd(globalKey, score, member)
        .pexpire(globalKey, 60 * 60 * 1000)
        .exec(),
    ]);

    return true;
  }

  private async countWindow(key: string, from: number, to: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, from);
    pipeline.zcount(key, from, to);
    const results = await pipeline.exec();
    return results?.[1]?.[1] as number ?? 0;
  }
}
