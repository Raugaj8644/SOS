import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'CHANGE_ME_IN_PRODUCTION',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'CHANGE_ME_IN_PRODUCTION_REFRESH',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS ?? '7', 10),
}));
