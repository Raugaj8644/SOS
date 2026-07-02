import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email is already registered.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });
    await this.userRepo.save(user);

    const tokens = await this.issueTokens(user, null, null);
    return { user: this.sanitize(user), tokens };
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string,
  ): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Generic error — don't reveal if email exists
    const invalidErr = new UnauthorizedException('Invalid email or password.');

    if (!user || !user.isActive) throw invalidErr;

    // Account lock check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `Account locked. Try again in ${minutes} minute(s).`,
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        this.logger.warn(`Account locked for user ${user.id} after ${MAX_FAILED_ATTEMPTS} failed attempts`);
      }
      await this.userRepo.save(user);
      throw invalidErr;
    }

    // Reset failed attempts on success
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    const tokens = await this.issueTokens(user, ip, userAgent);
    return { user: this.sanitize(user), tokens };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────
  async refresh(
    rawToken: string,
    ip: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);

    // Find by comparing hashes (O(n) in worst case — use index on token_hash)
    const allActive = await this.refreshTokenRepo.find({
      where: { isRevoked: false },
      relations: ['user'],
    });

    let found: RefreshToken | null = null;
    for (const rt of allActive) {
      if (await bcrypt.compare(rawToken, rt.tokenHash)) {
        found = rt;
        break;
      }
    }

    if (!found || found.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Revoke old token (rotation)
    found.isRevoked = true;
    found.revokedAt = new Date();
    await this.refreshTokenRepo.save(found);

    const newTokens = await this.issueTokens(found.user, ip, userAgent);
    found.replacedBy = newTokens.refreshTokenId;
    await this.refreshTokenRepo.save(found);

    return newTokens;
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  // ── Update FCM Token ─────────────────────────────────────────────────────────
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { fcmToken });
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────
  private async issueTokens(
    user: User,
    ip: string | null,
    userAgent: string | null,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
    });

    // Opaque refresh token — store only the hash
    const rawRefreshToken = randomUUID() + randomUUID(); // 72-char random string
    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);
    const expiryDays = parseInt(
      this.config.get<string>('JWT_REFRESH_EXPIRY_DAYS', '7'),
      10,
    );
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000);

    const rt = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });
    const saved = await this.refreshTokenRepo.save(rt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenId: saved.id,
      expiresIn: 15 * 60, // seconds
    };
  }

  private sanitize(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresIn: number;
}
