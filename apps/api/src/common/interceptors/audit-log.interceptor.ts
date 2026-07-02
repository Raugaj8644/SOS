import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { Reflector } from '@nestjs/core';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Only log handlers that are decorated with @AuditAction(...)
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    const areaId: string | undefined = req.params?.areaId;
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          this.auditRepo
            .save({
              action,
              userId: userId ?? null,
              areaId: areaId ?? null,
              entityId: responseData?.id ?? req.params?.id ?? null,
              newValue: responseData ?? null,
              ipAddress: ip?.toString().split(',')[0] ?? null,
              userAgent: userAgent ?? null,
            })
            .catch((err) => this.logger.error('Audit log write failed', err));
        },
        error: () => {
          // Don't audit failed actions (they didn't change state)
        },
      }),
    );
  }
}
