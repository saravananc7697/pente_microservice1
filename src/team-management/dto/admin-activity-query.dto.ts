import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserOrigin {
  PENTE_ADMIN = 'pente_admin',
  TENANT_ADMIN = 'tenant_admin',
}

export enum LoginStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/**
 * Admin Activity Query DTO
 * Query parameters for fetching admin login activity
 */
export class AdminActivityQueryDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of records per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by user origin',
    enum: UserOrigin,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserOrigin)
  userOrigin?: UserOrigin;

  @ApiProperty({
    description: 'Filter by login status',
    enum: LoginStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(LoginStatus)
  status?: LoginStatus;

  @ApiProperty({
    description: 'Search by admin name or email',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter from date (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiProperty({
    description: 'Filter to date (ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  toDate?: string;
}
