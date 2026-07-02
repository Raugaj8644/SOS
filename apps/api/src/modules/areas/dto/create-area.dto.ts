import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsNumber, IsEmail, IsDateString, MaxLength, Min,
} from 'class-validator';
import { AreaType } from '../entities/area.entity';

export class GeoJsonPolygonDto {
  @IsString()
  type: 'Polygon';

  // Array of rings, each ring is an array of [lng, lat] pairs
  coordinates: number[][][];
}

export class CreateAreaDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AreaType)
  type: AreaType;

  @IsOptional()
  polygon?: GeoJsonPolygonDto;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyPhone?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateAreaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  polygon?: GeoJsonPolygonDto;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyPhone?: string;
}

export class JoinAreaDto {
  @IsOptional()
  @IsString()
  token?: string; // QR token or invite code

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
