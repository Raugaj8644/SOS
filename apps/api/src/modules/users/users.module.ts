import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  Controller, Get, Patch, Body, UseGuards,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AreaMembership } from '../areas/entities/area-membership.entity';

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
}

@Injectable()
class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AreaMembership) private readonly memberRepo: Repository<AreaMembership>,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    await this.userRepo.update(userId, dto);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const { passwordHash, fcmToken, ...safe } = user as any;
    return safe;
  }

  async getMyAreas(userId: string): Promise<AreaMembership[]> {
    return this.memberRepo.find({
      where: { userId, isActive: true },
      relations: ['area'],
      order: { joinedAt: 'DESC' },
    });
  }
}

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/areas')
  getMyAreas(@CurrentUser() user: User) {
    return this.usersService.getMyAreas(user.id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, AreaMembership])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
