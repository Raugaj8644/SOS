import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string()
    .min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and number'),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ── Incident ──────────────────────────────────────────────────────────────────
export const CreateIncidentSchema = z.object({
  type:        z.enum(['medical_emergency','injury','fire','violence',
                        'missing_person','suspicious_activity','emergency','other']),
  latitude:    z.number().min(-90).max(90),
  longitude:   z.number().min(-180).max(180),
  description: z.string().max(2000).optional(),
  severity:    z.enum(['low','medium','high','critical']).optional(),
  mediaIds:    z.array(z.string().uuid()).max(5).optional(),
});

// ── Area ─────────────────────────────────────────────────────────────────────
export const CreateAreaSchema = z.object({
  name:           z.string().min(3).max(200),
  type:           z.enum(['university','school','company','concert','camp',
                           'marathon','community','open_house','other']),
  description:    z.string().max(1000).optional(),
  polygon:        z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))) }),
  contactEmail:   z.string().email().optional(),
  emergencyPhone: z.string().max(20).optional(),
  isPublic:       z.boolean().default(true),
  maxMembers:     z.number().int().positive().max(100_000).optional(),
});

export type RegisterDto       = z.infer<typeof RegisterSchema>;
export type LoginDto          = z.infer<typeof LoginSchema>;
export type CreateIncidentDto = z.infer<typeof CreateIncidentSchema>;
export type CreateAreaDto     = z.infer<typeof CreateAreaSchema>;
