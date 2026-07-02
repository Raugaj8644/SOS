import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import {
  Controller, Post, Param, Body, UseGuards, BadRequestException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { IsString, IsNumber, IsIn, MaxLength, Max } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { IncidentMedia } from '../incidents/entities/incident-media.entity';
import { AreaMembership } from '../areas/entities/area-membership.entity';
import { Area } from '../areas/entities/area.entity';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

class RequestUploadDto {
  @IsString() @IsIn(ALLOWED_MIME_TYPES) mimeType: string;
  @IsNumber() @Max(MAX_SIZE_BYTES) sizeBytes: number;
  @IsString() @MaxLength(255) fileName: string;
  @IsString() @MaxLength(36) incidentId: string;
}

@Injectable()
class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'cerp-media');
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
      forcePathStyle: config.get('NODE_ENV') !== 'production', // MinIO needs this
    });
  }

  async getPresignedUploadUrl(
    areaId: string,
    incidentId: string,
    fileName: string,
    mimeType: string,
    userId: string,
  ): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> {
    const ext = fileName.split('.').pop() ?? 'bin';
    const s3Key = `incidents/${areaId}/${incidentId}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
      Metadata: {
        'uploaded-by': userId,
        'incident-id': incidentId,
        'area-id': areaId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min
    return { uploadUrl, s3Key, expiresIn: 300 };
  }
}

@Controller({ path: 'areas/:areaId/media', version: '1' })
@UseGuards(JwtAuthGuard, AreaMemberGuard)
class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  requestUploadUrl(
    @Param('areaId') areaId: string,
    @Body() dto: RequestUploadDto,
    @CurrentUser() user: User,
  ) {
    if (dto.sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 10MB limit.');
    }
    return this.mediaService.getPresignedUploadUrl(
      areaId,
      dto.incidentId,
      dto.fileName,
      dto.mimeType,
      user.id,
    );
  }
}

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([IncidentMedia, AreaMembership, Area])],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
