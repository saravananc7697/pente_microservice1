import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../../schema/roles_and_policy/user_roles.schema';

@Injectable()
export class UserRoleService {
  constructor(
    @InjectModel(UserRole.name, 'mongo')
    private readonly userRoleModel: Model<UserRole>,
  ) {}

  async assignRole(data: {
    userId: string;
    roleId: string;
    assignedBy?: string;
    expiresAt?: Date;
    reason?: string;
  }) {
    const roleObjectId = new Types.ObjectId(data.roleId);

    // Check if there's an existing assignment (active or deleted)
    const existingAssignment = await this.userRoleModel.findOne({
      userId: data.userId,
      roleId: roleObjectId,
    });

    if (existingAssignment) {
      // If it's soft-deleted, restore it
      if (existingAssignment.deletedAt) {
        existingAssignment.deletedAt = undefined;
        existingAssignment.isActive = true;
        existingAssignment.assignedBy = data.assignedBy;
        existingAssignment.reason = data.reason || 'Role restored';
        if (data.expiresAt) {
          (existingAssignment as any).expiresAt = data.expiresAt;
        }
        return existingAssignment.save();
      }
      // Already active, just return it
      return existingAssignment;
    }

    // Create new assignment
    const userRole = new this.userRoleModel({
      userId: data.userId, // PostgreSQL UUID as string
      roleId: roleObjectId,
      assignedBy: data.assignedBy, // PostgreSQL UUID as string
      expiresAt: data.expiresAt,
      reason: data.reason,
    });
    return userRole.save();
  }

  getUserRoles(userId: string) {
    // userId is a PostgreSQL UUID string, not an ObjectId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (this.userRoleModel as any).getActiveUserRoles(userId);
  }

  getUsersWithRole(roleId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (this.userRoleModel as any).getUsersWithRole(
      new Types.ObjectId(roleId),
    );
  }

  hasRole(userId: string, roleId: string) {
    // userId is a PostgreSQL UUID string, roleId is MongoDB ObjectId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (this.userRoleModel as any).hasRole(
      userId,
      new Types.ObjectId(roleId),
    );
  }

  async revokeRole(userId: string, roleId: string, revokedBy?: string) {
    const userRole = await this.userRoleModel.findOne({
      userId: userId as any,
      roleId: roleId as any,
      isActive: true,
    });
    if (userRole) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (userRole as any).revoke(
        revokedBy ? new Types.ObjectId(revokedBy) : undefined,
      );
    }
    return null;
  }

  async revokeAllRoles(userId: string, revokedBy?: string) {
    // Find ALL active roles for this user
    const userRoles = await this.userRoleModel.find({
      userId: userId as any,
      isActive: true,
      deletedAt: null,
    });

    // Revoke each one
    const revokePromises = userRoles.map((userRole) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      (userRole as any).revoke(
        revokedBy ? new Types.ObjectId(revokedBy) : undefined,
      ),
    );

    return Promise.all(revokePromises);
  }

  async extendExpiry(userId: string, roleId: string, days: number) {
    const userRole = await this.userRoleModel.findOne({
      userId: userId as any,
      roleId: roleId as any,
      isActive: true,
    });
    if (userRole) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (userRole as any).extendExpiry(days);
    }
    return null;
  }

  async findAll() {
    return this.userRoleModel
      .find({ deletedAt: null })
      .populate('userId')
      .populate({
        path: 'roleId',
        populate: {
          path: 'policies',
          populate: { path: 'permissions' },
        },
      })
      .exec();
  }
}
