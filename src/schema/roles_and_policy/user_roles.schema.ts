import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * UserRole Schema
 * Maps users to their assigned roles for access control
 */
@Schema({
  timestamps: true,
  collection: 'user_roles',
})
export class UserRole extends Document {
  /**
   * Reference to the user
   */
  @Prop({
    type: String,
    required: true,
  })
  userId: string;

  /**
   * Reference to the role
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Role',
    required: true,
    index: true,
  })
  roleId: Types.ObjectId;

  /**
   * Whether this role assignment is currently active
   */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  /**
   * User who assigned this role
   */
  @Prop({
    type: String,
    required: false,
  })
  assignedBy?: string;

  /**
   * Timestamp when the role was assigned
   */
  @Prop({ type: Date, default: Date.now })
  assignedAt: Date;

  /**
   * Reason for role assignment
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  reason?: string;

  /**
   * Soft delete timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * Additional metadata for the assignment
   */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);

// Compound index to ensure a user can't have the same ACTIVE role twice
// Partial index only applies when deletedAt is null
UserRoleSchema.index(
  { userId: 1, roleId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: { $eq: null } },
  },
);

// Index for finding active roles for a user
UserRoleSchema.index({ userId: 1, isActive: 1, deletedAt: 1 });

// Index for finding all users with a specific role
UserRoleSchema.index({ roleId: 1, isActive: 1, deletedAt: 1 });

// Method to revoke role (soft delete)
UserRoleSchema.methods.revoke = function (revokedBy?: string) {
  (this as UserRole).deletedAt = new Date();
  (this as UserRole).isActive = false;
  if (revokedBy) {
    (this as UserRole).metadata = {
      ...(this as UserRole).metadata,
      revokedBy,
      revokedAt: new Date(),
    };
  }
  return (this as UserRole).save();
};

// Method to restore role
UserRoleSchema.methods.restore = function () {
  (this as UserRole).deletedAt = undefined;
  (this as UserRole).isActive = true;
  return (this as UserRole).save();
};

// Static method to get active roles for a user
UserRoleSchema.statics.getActiveUserRoles = function (userId: string) {
  return (
    this.find({
      userId,
      isActive: true,
      deletedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }) as UserRole
  ).populate('roleId');
};

// Static method to get all users with a specific role
UserRoleSchema.statics.getUsersWithRole = function (roleId: Types.ObjectId) {
  return (
    this.find({
      roleId,
      isActive: true,
      deletedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }) as UserRole
  ).populate('userId');
};

// Static method to check if user has role
UserRoleSchema.statics.hasRole = async function (
  userId: string,
  roleId: Types.ObjectId,
) {
  const count = await this.countDocuments({
    userId,
    roleId,
    isActive: true,
    deletedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });
  return count > 0;
};
