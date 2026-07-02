import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs: number; // sliding window in ms
  max: number;      // max requests per window
  keyPrefix: string;
}

/**
 * Sliding-window rate limiter backed by Redis.
 * Uses ZADD + ZREMRANGEBYSCORE for O(log N) per request.
 */
function makeRateLimiter(options: RateLimitOptions) {
  return async (redis: Redis, identifier: string): Promise<boolean> => {
    const now = Date.now();
    const key = `rl:${options.keyPrefix}:${identifier}`;
    const windowStart = now - options.windowMs;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, options.windowMs);
    const results = await pipeline.exec();

    const count = results?.[2]?.[1] as number ?? 0;
    return count <= options.max;
  };
}

// Pre-configured limiters
const sosLimiter     = makeRateLimiter({ windowMs: 60_000, max: 3,   keyPrefix: 'sos' });
const authLimiter    = makeRateLimiter({ windowMs: 60_000, max: 10,  keyPrefix: 'auth' });
const apiLimiter     = makeRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'api' });
const uploadLimiter  = makeRateLimiter({ windowMs: 60_000, max: 10,  keyPrefix: 'upload' });

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip  = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    const uid = (req as any).user?.id;
    const key = uid ?? ip;
    const path = req.path;

    let allowed = true;

    if (path.includes('/incidents') && req.method === 'POST') {
      allowed = await sosLimiter(this.redis, key);
    } else if (path.includes('/auth')) {
      allowed = await authLimiter(this.redis, ip); // always IP for auth
    } else if (path.includes('/media')) {
      allowed = await uploadLimiter(this.redis, key);
    } else {
      allowed = await apiLimiter(this.redis, key);
    }

    if (!allowed) {
      res.setHeader('Retry-After', '60');
      throw new HttpException(
        { success: false, message: 'Too many requests. Please slow down.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
