import { IsEmail, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class UpdateFcmTokenDto {
  @IsString()
  @MaxLength(500)
  fcmToken: string;
}
