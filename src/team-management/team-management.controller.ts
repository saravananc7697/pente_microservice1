import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TeamManagementService } from './team-management.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { SendResetLinkDto } from './dto/send-reset-link.dto';
import { QueryUsersDto } from './dto/user.dto';

/**
 * Team Management Controller
 * Handles all team and admin user management endpoints
 */
@ApiTags('Team Management')
@Controller('team-management')
export class TeamManagementController {
  constructor(private readonly teamManagementService: TeamManagementService) {}

  /**
   * Create Admin endpoint
   * Creates a new admin user in the system
   * @param createAdminDto - Admin user data (email, name, type, status)
   * @returns Created admin user information
   */
  @Post('admin')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Create Admin User',
    description:
      'Creates a new admin user with the specified details. Requires authentication.',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin user created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Admin user created successfully' },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'admin@example.com' },
            name: { type: 'string', example: 'John Doe' },
            adminUserType: { type: 'string', example: 'admin' },
            adminUserStatus: { type: 'string', example: 'active' },
            createdAt: {
              type: 'string',
              example: '2026-02-05T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              example: '2026-02-05T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Admin user with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create admin user',
  })
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Req() req: any) {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    const admin = await this.teamManagementService.createAdmin(
      createAdminDto,
      token,
    );

    return {
      message: 'Admin user created successfully',
      ...admin,
    };
  }

  /**
   * Update Admin endpoint
   * Updates an existing admin user in the system
   * @param id - Admin user ID (UUID)
   * @param updateAdminDto - Admin user data to update (all fields optional)
   * @returns Updated admin user information
   */
  @Patch('admin/:id')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Update Admin User',
    description:
      'Updates an existing admin user with the specified details. All fields are optional for partial updates. Use adminUserStatus to set user as ACTIVE, INACTIVE, or SUSPENDED. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Admin user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Admin user updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Admin user updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'admin@example.com' },
            name: { type: 'string', example: 'John Doe' },
            adminUserType: { type: 'string', example: 'admin' },
            adminUserStatus: { type: 'string', example: 'active' },
            createdAt: {
              type: 'string',
              example: '2026-02-05T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              example: '2026-02-06T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Admin user not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists for another admin user',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to update admin user',
  })
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    const admin = await this.teamManagementService.updateAdmin(
      id,
      updateAdminDto,
    );

    // Populate role for response (single role only)
    const userRoles = await this.teamManagementService.getUserRoles(id);

    return {
      message: 'Admin user updated successfully',
      data: {
        ...admin,
        role: userRoles.length > 0 ? userRoles[0].roleId : null,
      },
    };
  }

  @Get('admin-users')
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(@Query() query: QueryUsersDto) {
    const result = await this.teamManagementService.findAll(query);

    // Populate role for each user (single role only)
    const usersWithRoles = await Promise.all(
      result.data.map(async (user) => {
        const userRoles = await this.teamManagementService.getUserRoles(
          user.id,
        );
        return {
          ...user,
          role: userRoles.length > 0 ? userRoles[0].roleId : null,
        };
      }),
    );

    return {
      ...result,
      data: usersWithRoles,
    };
  }

  /**
   * Suspend Admin User endpoint
   * Suspends an admin user (sets adminUserStatus to 'suspended')
   * Used for both "Suspend Admin" and "Remove Admin" UI actions
   * @param adminId - ID of the admin user to suspend
   * @param req - Request object containing authenticated user info
   * @returns Success message
   */
  @Post('admin-users/:adminId/suspend')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Suspend Admin User',
    description:
      'Suspends an admin user by setting their status to suspended. Both "Suspend Admin" and "Remove Admin" UI actions use this endpoint. Requires authentication and appropriate permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin user suspended successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin suspended successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Admin is already suspended',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Cannot suspend yourself or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Admin user not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async suspendAdmin(@Param('adminId') adminId: string, @Req() req: any) {
    const actorAdminId = req.user?.id;
    await this.teamManagementService.suspendAdmin(adminId, actorAdminId);

    return {
      message: 'Admin suspended successfully',
    };
  }

  /**
   * Reactivate Admin User endpoint
   * Reactivates a suspended admin user (sets adminUserStatus to 'active')
   * Used for "Reactivate Admin" UI action in Team Management
   * @param adminId - ID of the admin user to reactivate
   * @param req - Request object containing authenticated user info
   * @returns Success message
   */
  @Post('admin-users/:adminId/reactivate')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Reactivate Admin User',
    description:
      'Reactivates a suspended admin user by setting their status to active. The "Reactivate Admin" UI action uses this endpoint. Requires authentication and appropriate permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin user reactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin reactivated successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Admin is already active',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Cannot reactivate yourself or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Admin user not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async reactivateAdmin(@Param('adminId') adminId: string, @Req() req: any) {
    const actorAdminId = req.user?.id;
    await this.teamManagementService.reactivateAdmin(adminId, actorAdminId);

    return {
      message: 'Admin reactivated successfully',
    };
  }

  /**
   * Send Password Reset Link endpoint
   * Sends a password reset link to the admin user's email
   * @param sendResetLinkDto - Contains the email address
   * @param req - Request object containing authenticated user info
   * @returns Success message
   */
  @Post('admin/send-reset-link')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Send Password Reset Link',
    description:
      'Sends a password reset link to the specified admin user email address. Requires authentication.',
  })
  @ApiBody({ type: SendResetLinkDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset link sent successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to send reset link',
  })
  async sendResetLink(
    @Body() sendResetLinkDto: SendResetLinkDto,
    @Req() req: any,
  ) {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    await this.teamManagementService.sendResetLink(
      sendResetLinkDto.email,
      token,
    );

    return {
      message: 'Password reset link sent successfully',
    };
  }
}
