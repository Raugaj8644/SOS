import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address.' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must include uppercase, lowercase, and a number.',
  })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100)
  @Transform(({ value }) => (value as string).trim())
  name: string;
}
