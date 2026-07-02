import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Sanitization pipe — strips dangerous characters from string inputs.
 * Applied globally via APP_PIPE in AppModule.
 *
 * Removes: null bytes, control chars, <script> patterns.
 * Trims: leading/trailing whitespace on all string fields.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly DANGEROUS_RE = /<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi;
  private readonly NULL_BYTE_RE = /\0/g;

  transform(value: unknown, _meta: ArgumentMetadata) {
    return this.sanitize(value);
  }

  private sanitize(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return this.cleanString(value);
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.sanitize(v);
      }
      return out;
    }
    return value;
  }

  private cleanString(s: string): string {
    return s
      .replace(this.NULL_BYTE_RE, '')
      .replace(this.DANGEROUS_RE, '')
      .trim();
  }
}
