import {
  IsEnum, IsOptional, IsNumber, IsString,
  Min, Max, MaxLength,
} from 'class-validator';
import { IncidentType } from '../entities/incident.entity';

export class CreateIncidentDto {
  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @IsNumber()
  @IsOptional()
  @Min(-90) @Max(90)
  lat?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180) @Max(180)
  lng?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number; // GPS accuracy in meters

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CloseIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  closeReason?: string;
}

export class RespondToIncidentDto {
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  lng?: number;
}

export class PostIncidentUpdateDto {
  @IsString()
  @MaxLength(2000)
  message: string;
}
