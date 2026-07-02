import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    // ── NestJS HTTP Exception ─────────────────────────────────────────────────
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message ?? message;
        error = (res as any).error ?? exception.name;
      }

    // ── TypeORM unique constraint violation ───────────────────────────────────
    } else if (exception instanceof QueryFailedError) {
      const pgError = exception as any;
      if (pgError.code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        message = 'A record with this value already exists.';
        error = 'Conflict';
      } else if (pgError.code === '23503') {
        statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Referenced resource does not exist.';
        error = 'UnprocessableEntity';
      } else {
        this.logger.error(`DB error ${pgError.code}: ${pgError.message}`);
      }

    // ── Unknown error ─────────────────────────────────────────────────────────
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const body: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }
}
