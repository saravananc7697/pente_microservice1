import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  AdminUser,
  AdminUserType,
  AdminUserStatus,
} from '../entity/admin-user.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UserRole } from '../schema/roles_and_policy/user_roles.schema';
import {
  ERROR_MESSAGES,
  LOG_MESSAGES,
} from '../common/constants/messages.constant';
import { QueryUsersDto } from './dto/user.dto';
import { UserRoleService } from '../rbac/services/user-role.service';

/**
 * Admin User List Query DTO Interface
 */
export interface AdminUserListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  adminUserType?: 'super_admin' | 'admin';
  adminUserStatus?: 'active' | 'inactive' | 'suspended';
  fromDate?: string;
  toDate?: string;
  sortBy?: 'name' | 'adminUserType' | 'adminUserStatus' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Team Management Service
 * Handles business logic for team and admin user management operations
 */
@Injectable()
export class TeamManagementService {
  private readonly authServiceUrl: string;

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectModel(UserRole.name, 'mongo')
    private readonly userRoleModel: Model<UserRole>,
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly userRoleService: UserRoleService,
  ) {
    this.logger.setContext(TeamManagementService.name);
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_BASE_URL') ||
      'http://localhost:4000';
  }

  /**
   * Create a new admin user
   * @param createAdminDto - Admin user data
   * @param authToken - JWT token from authenticated admin user
   * @returns Created admin user
   * @throws ConflictException if admin with email already exists
   * @throws InternalServerErrorException if creation fails
   */
  async createAdmin(
    createAdminDto: CreateAdminDto,
    authToken?: string,
  ): Promise<AdminUser> {
    const { email, name, roleId } = createAdminDto;

    // Normalize adminUserType to handle variations
    let adminUserType = createAdminDto.adminUserType || AdminUserType.ADMIN;
    if ((adminUserType as any) === 'superadmin') {
      adminUserType = AdminUserType.SUPER_ADMIN;
    }

    // Normalize adminUserStatus to handle variations
    let adminUserStatus =
      createAdminDto.adminUserStatus || AdminUserStatus.ACTIVE;

    try {
      this.logger.info(
        { email, adminUserType },
        LOG_MESSAGES.ADMIN_CREATION_ATTEMPT,
      );

      // Check if admin with email already exists
      const existingAdmin = await this.adminUserRepository.findOne({
        where: { email },
      });

      if (existingAdmin) {
        this.logger.warn(
          { email },
          'Admin user with this email already exists',
        );
        throw new ConflictException(ERROR_MESSAGES.ADMIN_ALREADY_EXISTS);
      }

      // Call auth service to create user
      let authServiceResponse;
      try {
        this.logger.info(
          { email, name, adminUserType },
          'Calling auth service to create user',
        );

        // Auth service SignUpDto only expects email
        const authServicePayload = {
          email,
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if token is provided
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await axios.post(
          `${this.authServiceUrl}/api/auth/support-admin/signup`,
          authServicePayload,
          {
            headers,
            timeout: 10000, // 10 second timeout
          },
        );

        authServiceResponse = response.data;

        this.logger.info(
          { email, userSub: authServiceResponse.data?.userSub },
          'Auth service user created successfully',
        );
      } catch (authError) {
        const axiosError = authError as AxiosError;

        this.logger.error(
          {
            email,
            errorStatus: axiosError.response?.status,
            errorMessage: axiosError.message,
            errorData: axiosError.response?.data,
          },
          'Failed to create user in auth service',
        );

        // Determine appropriate error message based on status code
        const statusCode = axiosError.response?.status;
        const responseData = axiosError.response?.data as any;

        if (
          axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ETIMEDOUT'
        ) {
          throw new InternalServerErrorException(
            ERROR_MESSAGES.AUTH_SERVICE_UNAVAILABLE,
          );
        }

        if (statusCode === 409) {
          // User already exists in auth service (Cognito)
          throw new ConflictException(
            responseData?.message || 'User already exists in auth service',
          );
        }

        if (statusCode === 400) {
          // Validation error from auth service
          const validationMessage = Array.isArray(responseData?.message)
            ? responseData.message.join(', ')
            : responseData?.message ||
              ERROR_MESSAGES.AUTH_SERVICE_VALIDATION_ERROR;
          throw new BadRequestException(validationMessage);
        }

        // Generic error for other cases
        throw new InternalServerErrorException(
          responseData?.message || ERROR_MESSAGES.AUTH_SERVICE_SIGNUP_FAILED,
        );
      }

      // Create new admin user with userSub from auth service
      const newAdmin = this.adminUserRepository.create({
        email,
        name,
        adminUserType,
        adminUserStatus,
        userSub: authServiceResponse.data?.userSub,
      });

      const savedAdmin = await this.adminUserRepository.save(newAdmin);

      // Assign role if roleId is provided
      if (roleId) {
        await this.assignRoleToUser(savedAdmin.id, roleId);
      }

      this.logger.info(
        {
          email,
          adminId: savedAdmin.id,
          adminUserType: savedAdmin.adminUserType,
          userSub: savedAdmin.userSub,
          roleAssigned: !!roleId,
        },
        LOG_MESSAGES.ADMIN_CREATED_SUCCESS,
      );

      return savedAdmin;
    } catch (error) {
      // Re-throw known NestJS exceptions (they have proper HTTP status codes)
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Log and throw internal server error for unknown errors
      this.logger.error(
        {
          email,
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack,
        },
        LOG_MESSAGES.ADMIN_CREATION_ERROR,
      );

      throw new InternalServerErrorException(
        ERROR_MESSAGES.ADMIN_CREATION_FAILED,
      );
    }
  }

  /**
   * Update an existing admin user
   * @param id - Admin user ID
   * @param updateAdminDto - Admin user data to update
   * @returns Updated admin user
   * @throws NotFoundException if admin user not found
   * @throws ConflictException if email already exists (when updating email)
   * @throws InternalServerErrorException if update fails
   */
  async updateAdmin(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<AdminUser> {
    const { email, name, adminUserType, adminUserStatus, roleId } =
      updateAdminDto;

    try {
      this.logger.info(
        { adminId: id, updateFields: Object.keys(updateAdminDto) },
        LOG_MESSAGES.ADMIN_UPDATE_ATTEMPT,
      );

      // Find existing admin user
      const existingAdmin = await this.adminUserRepository.findOne({
        where: { id },
      });

      if (!existingAdmin) {
        this.logger.warn({ adminId: id }, 'Admin user not found');
        throw new NotFoundException(ERROR_MESSAGES.ADMIN_NOT_FOUND);
      }

      // Check if email is being updated and if new email already exists
      if (email && email !== existingAdmin.email) {
        const emailExists = await this.adminUserRepository.findOne({
          where: { email },
        });

        if (emailExists) {
          this.logger.warn(
            { adminId: id, email },
            'Email already exists for another admin user',
          );
          throw new ConflictException(ERROR_MESSAGES.ADMIN_ALREADY_EXISTS);
        }
      }

      // Update fields if provided
      if (email !== undefined) existingAdmin.email = email;
      if (name !== undefined) existingAdmin.name = name;
      if (adminUserType !== undefined)
        existingAdmin.adminUserType = adminUserType;
      if (adminUserStatus !== undefined)
        existingAdmin.adminUserStatus = adminUserStatus;

      const updatedAdmin = await this.adminUserRepository.save(existingAdmin);

      // Handle role update if roleId is provided
      if (roleId !== undefined) {
        // Revoke ALL existing roles for this user
        await this.userRoleService.revokeAllRoles(updatedAdmin.id);

        // If roleId is provided (not null), assign the new role
        if (roleId) {
          await this.userRoleService.assignRole({
            userId: updatedAdmin.id,
            roleId: roleId,
            reason: 'Role updated',
          });
        }
      }

      this.logger.info(
        {
          adminId: updatedAdmin.id,
          email: updatedAdmin.email,
          adminUserType: updatedAdmin.adminUserType,
          adminUserStatus: updatedAdmin.adminUserStatus,
        },
        LOG_MESSAGES.ADMIN_UPDATED_SUCCESS,
      );

      return updatedAdmin;
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Log and throw internal server error for unknown errors
      this.logger.error(
        {
          adminId: id,
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
        },
        LOG_MESSAGES.ADMIN_UPDATE_ERROR,
      );

      throw new InternalServerErrorException(
        ERROR_MESSAGES.ADMIN_UPDATE_FAILED,
      );
    }
  }

  async findAll(query: QueryUsersDto) {
    const { page = 1, pageSize = 10, adminUserStatus } = query;

    const skip = (page - 1) * pageSize;
    const where: FindOptionsWhere<AdminUser> = {};

    // Apply filters
    if (adminUserStatus && adminUserStatus.length > 0) {
      where.adminUserStatus = In(adminUserStatus);
    }

    // Get users
    const [users, total] = await this.adminUserRepository.findAndCount({
      where,
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    // If role filter is provided, we need to filter by role from MongoDB user_roles
    // This would require injecting UserRoleService and cross-referencing
    // For now, returning all users and noting this in response

    return {
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  getUserRoles(userId: string) {
    // userId is a PostgreSQL UUID string, not an ObjectId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (this.userRoleModel as any).getActiveUserRoles(userId);
  }

  /**
   * Assign role to user in MongoDB
   * @param userId - Admin user ID from PostgreSQL
   * @param roleId - MongoDB Role ObjectId
   * @private
   */
  private async assignRoleToUser(
    userId: string,
    roleId: string,
  ): Promise<void> {
    try {
      // Check if user already has this role
      const existingRole = await this.userRoleModel.findOne({
        userId,
        roleId: new Types.ObjectId(roleId),
        isActive: true,
        deletedAt: null,
      });

      if (existingRole) {
        this.logger.info(
          { userId, roleId },
          'User already has this role assigned',
        );
        return;
      }

      // Create new role assignment
      await this.userRoleModel.create({
        userId,
        roleId: new Types.ObjectId(roleId),
        isActive: true,
        assignedAt: new Date(),
      });

      this.logger.info(
        { userId, roleId },
        'Role assigned to user successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          userId,
          roleId,
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
        },
        'Error assigning role to user',
      );
      // Don't throw - role assignment failure shouldn't fail admin creation
    }
  }

  /**
   * Update user role in MongoDB
   * @param userId - Admin user ID from PostgreSQL
   * @param roleId - MongoDB Role ObjectId (null to remove role)
   * @private
   */
  private async updateUserRole(
    userId: string,
    roleId: string | null,
  ): Promise<void> {
    try {
      // Deactivate all existing roles for this user
      await this.userRoleModel.updateMany(
        { userId, isActive: true },
        { isActive: false, deletedAt: new Date() },
      );

      // If roleId provided, assign new role
      if (roleId) {
        await this.userRoleModel.create({
          userId,
          roleId: new Types.ObjectId(roleId),
          isActive: true,
          assignedAt: new Date(),
        });

        this.logger.info({ userId, roleId }, 'User role updated successfully');
      } else {
        this.logger.info({ userId }, 'User role removed successfully');
      }
    } catch (error) {
      this.logger.error(
        {
          userId,
          roleId,
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
        },
        'Error updating user role',
      );
      // Don't throw - role update failure shouldn't fail admin update
    }
  }

  /**
   * Suspend an admin user
   * @param targetAdminId - ID of admin user to suspend
   * @param actorAdminId - ID of admin user performing the action
   * @throws ForbiddenException if actor tries to suspend themselves
   * @throws NotFoundException if target admin does not exist
   * @throws BadRequestException if target admin is already suspended
   * @throws ForbiddenException if actor lacks permissions
   */
  async suspendAdmin(targetAdminId: string, actorAdminId: string) {
    this.logger.info(
      { targetAdminId, actorAdminId },
      LOG_MESSAGES.ADMIN_SUSPEND_ATTEMPT,
    );

    // Rule 1: Cannot suspend yourself
    if (actorAdminId === targetAdminId) {
      this.logger.warn(
        { targetAdminId, actorAdminId },
        'Admin attempted to suspend their own account',
      );
      throw new ForbiddenException(ERROR_MESSAGES.ADMIN_SELF_SUSPEND);
    }

    // Rule 2: Target admin must exist
    const targetAdmin = await this.adminUserRepository.findOne({
      where: { id: targetAdminId },
    });

    if (!targetAdmin) {
      this.logger.warn({ targetAdminId }, 'Target admin not found');
      throw new NotFoundException(ERROR_MESSAGES.ADMIN_NOT_FOUND);
    }

    // Rule 3: Admin must not already be suspended
    if (targetAdmin.adminUserStatus === AdminUserStatus.SUSPENDED) {
      this.logger.warn({ targetAdminId }, 'Admin is already suspended');
      throw new BadRequestException(ERROR_MESSAGES.ADMIN_ALREADY_SUSPENDED);
    }

    // Rule 4: ADMIN cannot suspend SUPER_ADMIN
    const actorAdmin = await this.adminUserRepository.findOne({
      where: { id: actorAdminId },
    });

    if (
      actorAdmin &&
      actorAdmin.adminUserType === AdminUserType.ADMIN &&
      targetAdmin.adminUserType === AdminUserType.SUPER_ADMIN
    ) {
      this.logger.warn(
        {
          targetAdminId,
          actorAdminId,
          targetType: targetAdmin.adminUserType,
          actorType: actorAdmin.adminUserType,
        },
        'ADMIN attempted to suspend SUPER_ADMIN',
      );
      throw new ForbiddenException(
        ERROR_MESSAGES.ADMIN_INSUFFICIENT_PERMISSIONS,
      );
    }

    // Update status to suspended
    targetAdmin.adminUserStatus = AdminUserStatus.SUSPENDED;
    await this.adminUserRepository.save(targetAdmin);

    this.logger.info(
      { targetAdminId, actorAdminId },
      LOG_MESSAGES.ADMIN_SUSPENDED_SUCCESS,
    );

    // Fire audit log asynchronously (non-blocking)
    this.fireAuditLog({
      action: 'ADMIN_SUSPENDED',
      actorAdminId,
      targetAdminId,
      timestamp: new Date(),
    }).catch((error) => {
      this.logger.error(
        { error: error.message, targetAdminId, actorAdminId },
        'Failed to log audit event for admin suspension',
      );
    });
  }

  /**
   * Reactivate an admin user
   * @param targetAdminId - ID of admin user to reactivate
   * @param actorAdminId - ID of admin user performing the action
   * @throws ForbiddenException if actor tries to reactivate themselves
   * @throws NotFoundException if target admin does not exist
   * @throws BadRequestException if target admin is already active
   * @throws ForbiddenException if actor lacks permissions
   */
  async reactivateAdmin(targetAdminId: string, actorAdminId: string) {
    this.logger.info(
      { targetAdminId, actorAdminId },
      LOG_MESSAGES.ADMIN_REACTIVATE_ATTEMPT,
    );

    // Rule 1: Cannot reactivate yourself
    if (actorAdminId === targetAdminId) {
      this.logger.warn(
        { targetAdminId, actorAdminId },
        'Admin attempted to reactivate their own account',
      );
      throw new ForbiddenException(ERROR_MESSAGES.ADMIN_SELF_REACTIVATE);
    }

    // Rule 2: Target admin must exist
    const targetAdmin = await this.adminUserRepository.findOne({
      where: { id: targetAdminId },
    });

    if (!targetAdmin) {
      this.logger.warn({ targetAdminId }, 'Target admin not found');
      throw new NotFoundException(ERROR_MESSAGES.ADMIN_NOT_FOUND);
    }

    // Rule 3: Admin must not already be active
    if (targetAdmin.adminUserStatus === AdminUserStatus.ACTIVE) {
      this.logger.warn({ targetAdminId }, 'Admin is already active');
      throw new BadRequestException(ERROR_MESSAGES.ADMIN_ALREADY_ACTIVE);
    }

    // Rule 4: ADMIN cannot reactivate SUPER_ADMIN
    const actorAdmin = await this.adminUserRepository.findOne({
      where: { id: actorAdminId },
    });

    if (
      actorAdmin &&
      actorAdmin.adminUserType === AdminUserType.ADMIN &&
      targetAdmin.adminUserType === AdminUserType.SUPER_ADMIN
    ) {
      this.logger.warn(
        {
          targetAdminId,
          actorAdminId,
          targetType: targetAdmin.adminUserType,
          actorType: actorAdmin.adminUserType,
        },
        'ADMIN attempted to reactivate SUPER_ADMIN',
      );
      throw new ForbiddenException(
        ERROR_MESSAGES.ADMIN_INSUFFICIENT_PERMISSIONS_REACTIVATE,
      );
    }

    // Update status to active
    targetAdmin.adminUserStatus = AdminUserStatus.ACTIVE;
    await this.adminUserRepository.save(targetAdmin);

    this.logger.info(
      { targetAdminId, actorAdminId },
      LOG_MESSAGES.ADMIN_REACTIVATED_SUCCESS,
    );

    // Fire audit log asynchronously (non-blocking)
    this.fireAuditLog({
      action: 'ADMIN_REACTIVATED',
      actorAdminId,
      targetAdminId,
      timestamp: new Date(),
    }).catch((error) => {
      this.logger.error(
        { error: error.message, targetAdminId, actorAdminId },
        'Failed to log audit event for admin reactivation',
      );
    });
  }

  /**
   * Fire audit log asynchronously
   * @param auditData - Audit log data
   */
  private async fireAuditLog(auditData: any): Promise<void> {
    // TODO: Implement actual audit logging mechanism
    // This could write to a separate audit table, send to a logging service, etc.
    this.logger.info(auditData, 'Audit log fired');
  }

  /**
   * Send password reset link to admin user
   * @param email - Email address of the admin user
   * @param authToken - JWT token from authenticated admin user
   * @throws NotFoundException if user not found
   * @throws InternalServerErrorException if sending fails
   */
  async sendResetLink(email: string, authToken?: string): Promise<void> {
    try {
      this.logger.info({ email }, LOG_MESSAGES.RESET_LINK_SEND_ATTEMPT);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token is provided
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.post(
        `${this.authServiceUrl}/api/auth/support-admin/send-reset-link`,
        { email },
        {
          headers,
          timeout: 10000, // 10 second timeout
        },
      );

      this.logger.info(
        { email, status: response.status },
        LOG_MESSAGES.RESET_LINK_SENT_SUCCESS,
      );
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger.error(
        {
          email,
          errorStatus: axiosError.response?.status,
          errorMessage: axiosError.message,
          errorData: axiosError.response?.data,
        },
        'Failed to send password reset link',
      );

      // Determine appropriate error message based on status code
      const statusCode = axiosError.response?.status;
      const responseData = axiosError.response?.data as any;

      if (
        axiosError.code === 'ECONNREFUSED' ||
        axiosError.code === 'ETIMEDOUT'
      ) {
        throw new InternalServerErrorException(
          ERROR_MESSAGES.AUTH_SERVICE_UNAVAILABLE,
        );
      }

      if (statusCode === 404) {
        // User not found
        throw new NotFoundException(
          responseData?.message || ERROR_MESSAGES.USER_NOT_FOUND,
        );
      }

      if (statusCode === 400) {
        // Validation error from auth service
        const validationMessage = Array.isArray(responseData?.message)
          ? responseData.message.join(', ')
          : responseData?.message ||
            ERROR_MESSAGES.AUTH_SERVICE_VALIDATION_ERROR;
        throw new BadRequestException(validationMessage);
      }

      // Generic error for other cases
      throw new InternalServerErrorException(
        responseData?.message || ERROR_MESSAGES.RESET_LINK_SEND_FAILED,
      );
    }
  }
}
