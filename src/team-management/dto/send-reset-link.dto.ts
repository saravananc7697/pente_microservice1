import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Send Reset Link DTO
 * Data Transfer Object for sending password reset link to admin user
 */
export class SendResetLinkDto {
  @ApiProperty({
    description: 'Email address of the admin user',
    example: 'admin@example.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
