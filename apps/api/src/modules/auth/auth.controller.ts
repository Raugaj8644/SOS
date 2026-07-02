import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, UpdateFcmTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const COOKIE_NAME = 'cerp_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/register
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 registrations/min per IP
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    return { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // POST /api/v1/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 10 attempts/min per IP
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? '';
    const ua = req.headers['user-agent'] ?? '';
    const { user, tokens } = await this.authService.login(dto, ip, ua);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    return { user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // POST /api/v1/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found.');
    }
    const ip = req.ip ?? '';
    const ua = req.headers['user-agent'] ?? '';
    const tokens = await this.authService.refresh(rawToken, ip, ua);
    res.cookie(COOKIE_NAME, tokens.refreshToken, COOKIE_OPTIONS);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // POST /api/v1/auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
  }

  // GET /api/v1/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    const { passwordHash, fcmToken, ...safe } = user as any;
    return safe;
  }

  // PATCH /api/v1/auth/fcm-token
  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  updateFcmToken(
    @CurrentUser() user: User,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.authService.updateFcmToken(user.id, dto.fcmToken);
  }
}
