import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { User } from '../src/modules/users/entities/user.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'uuid-1',
  email: 'test@cerp.io',
  name: 'Test User',
  passwordHash: bcrypt.hashSync('Password1', 4), // fast hash for tests
  failedLoginAttempts: 0,
  lockedUntil: null,
  globalRole: 'user',
  isActive: true,
};

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockRefreshTokenRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('access-token'),
  verify: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User),         useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: JwtService,                       useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser });
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});
      mockUserRepo.save.mockResolvedValue({});

      const result = await service.login(
        { email: 'test@cerp.io', password: 'Password1' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id }),
        expect.any(Object),
      );
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepo.save.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@cerp.io', password: 'WrongPass1' }, '127.0.0.1', 'agent'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws when account is locked', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
        failedLoginAttempts: 5,
      });

      await expect(
        service.login({ email: 'test@cerp.io', password: 'Password1' }, '127.0.0.1', 'agent'),
      ).rejects.toThrow(/locked/i);
    });

    it('throws when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@cerp.io', password: 'Password1' }, '127.0.0.1', 'agent'),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('account locking', () => {
    it('locks account after 5 failed attempts', async () => {
      const user = { ...mockUser, failedLoginAttempts: 4, lockedUntil: null };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation(async (u: any) => u);

      await expect(
        service.login({ email: 'test@cerp.io', password: 'WrongPass1' }, '127.0.0.1', 'agent'),
      ).rejects.toThrow();

      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }),
      );
    });
  });
});
