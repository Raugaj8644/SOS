import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../entities/audit-log.entity';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditActionDecorator = (action: AuditAction) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
