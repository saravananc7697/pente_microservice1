import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminUserType, AdminUserStatus } from '../../entity/admin-user.entity';

/**
 * Create Admin DTO
 * Data Transfer Object for creating a new admin user
 */
export class CreateAdminDto {
  @ApiProperty({
    description: 'Email address of the admin user',
    example: 'admin@example.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Name of the admin user',
    example: 'John Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Type of admin user',
    enum: AdminUserType,
    example: AdminUserType.ADMIN,
    required: false,
    default: AdminUserType.ADMIN,
  })
  @IsEnum(AdminUserType)
  @IsOptional()
  adminUserType?: AdminUserType;

  @ApiProperty({
    description: 'Status of the admin user',
    enum: AdminUserStatus,
    example: AdminUserStatus.ACTIVE,
    required: false,
    default: AdminUserStatus.ACTIVE,
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
