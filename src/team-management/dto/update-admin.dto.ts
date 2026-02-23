import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminUserType, AdminUserStatus } from '../../entity/admin-user.entity';

/**
 * Update Admin DTO
 * Data Transfer Object for updating an existing admin user
 * All fields are optional to allow partial updates
 */
export class UpdateAdminDto {
  @ApiProperty({
    description: 'Email address of the admin user',
    example: 'admin@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Name of the admin user',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiProperty({
    description: 'Type of admin user',
    enum: AdminUserType,
    example: AdminUserType.ADMIN,
    required: false,
  })
  @IsEnum(AdminUserType)
  @IsOptional()
  adminUserType?: AdminUserType;

  @ApiProperty({
    description: 'Status of the admin user',
    enum: AdminUserStatus,
    example: AdminUserStatus.ACTIVE,
    required: false,
  })
  @IsEnum(AdminUserStatus)
  @IsOptional()
  adminUserStatus?: AdminUserStatus;

  @ApiProperty({
    description: 'MongoDB Role ID to assign to the admin user',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  roleId?: string;
}
