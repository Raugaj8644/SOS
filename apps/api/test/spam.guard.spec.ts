import { ExecutionContext, HttpException } from '@nestjs/common';
import { SpamGuard } from '../src/common/guards/spam.guard';

const makePipeline = (count: number) => ({
  zremrangebyscore: jest.fn().mockReturnThis(),
  zadd:             jest.fn().mockReturnThis(),
  zcount:           jest.fn().mockReturnThis(),
  pexpire:          jest.fn().mockReturnThis(),
  exec:             jest.fn().mockResolvedValue([[null, 0], [null, count]]),
});

const mockRedis = {
  pipeline: jest.fn(),
};

const makeCtx = (userId: string, areaId: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user:   { id: userId },
        params: { areaId },
      }),
    }),
  } as unknown as ExecutionContext);

describe('SpamGuard', () => {
  let guard: SpamGuard;

  beforeEach(() => {
    guard = new SpamGuard(mockRedis as any);
  });

  it('allows request when under limits', async () => {
    mockRedis.pipeline.mockReturnValue(makePipeline(1));

    const result = await guard.canActivate(makeCtx('user1', 'area1'));
    expect(result).toBe(true);
  });

  it('blocks when area limit (3) is reached', async () => {
    // First call (area) returns 3, second call (global) returns 1
    let callCount = 0;
    mockRedis.pipeline.mockImplementation(() => makePipeline(callCount++ === 0 ? 3 : 1));

    await expect(guard.canActivate(makeCtx('user1', 'area1'))).rejects.toThrow(HttpException);
  });

  it('blocks when global limit (10) is reached', async () => {
    let callCount = 0;
    mockRedis.pipeline.mockImplementation(() => makePipeline(callCount++ === 0 ? 1 : 10));

    await expect(guard.canActivate(makeCtx('user1', 'area1'))).rejects.toThrow(HttpException);
  });
});
