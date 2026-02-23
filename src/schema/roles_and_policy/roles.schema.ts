import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Role Schema
 * Defines user roles that combine multiple policies for access control
 */
@Schema({
  timestamps: true,
  collection: 'roles',
})
export class Role extends Document {
  /**
   * Unique identifier for the role (e.g., 'admin', 'user', 'moderator')
   */
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-_]+$/,
    index: true,
  })
  roleIdentifier: string;

  /**
   * Human-readable name of the role
   */
  @Prop({
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  })
  name: string;

  /**
   * Detailed description of the role's purpose and capabilities
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  /**
   * Array of policy IDs associated with this role
   */
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Policy' }],
    default: [],
    validate: {
      validator: function (v: Types.ObjectId[]) {
        return v.length >= 0;
      },
      message: 'Policies must be a valid array',
    },
  })
  policies: Types.ObjectId[];

  /**
   * Hierarchy level for role inheritance (higher can inherit from lower)
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  })
  level: number;

  /**
   * Whether this role is currently active
   */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  /**
   * Whether this is a system-defined role (cannot be deleted)
   */
  @Prop({ type: Boolean, default: false })
  isSystem: boolean;

  /**
   * Whether this is a default role for new users
   */
  @Prop({ type: Boolean, default: false, index: true })
  isDefault: boolean;

  /**
   * Soft delete timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * Additional metadata for the role
   */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Compound indexes for efficient querying
RoleSchema.index({ isActive: 1, deletedAt: 1 });
RoleSchema.index({ level: -1, isActive: 1 });
RoleSchema.index({ isDefault: 1, isActive: 1 });

// Virtual for policy count
RoleSchema.virtual('policyCount').get(function () {
  return this.policies?.length || 0;
});

// Method to soft delete (prevent deletion of system roles)
RoleSchema.methods.softDelete = function () {
  if ((this as Role).isSystem) {
    throw new Error('Cannot delete system roles');
  }
  if ((this as Role).isDefault) {
    throw new Error('Cannot delete default role');
  }
  (this as Role).deletedAt = new Date();
  (this as Role).isActive = false;
  return (this as Role).save();
};

// Method to restore
RoleSchema.methods.restore = function () {
  (this as Role).deletedAt = undefined;
  (this as Role).isActive = true;
  return (this as Role).save();
};

// Method to add policy
RoleSchema.methods.addPolicy = function (policyId: Types.ObjectId) {
  if (!(this as Role).policies.includes(policyId)) {
    (this as Role).policies.push(policyId);
  }
  return (this as Role).save();
};

// Method to remove policy
RoleSchema.methods.removePolicy = function (policyId: Types.ObjectId) {
  (this as Role).policies = (this as Role).policies.filter(
    (id) => id.toString() !== policyId.toString(),
  );
  return (this as Role).save();
};

// Static method to get default role
RoleSchema.statics.getDefaultRole = function () {
  return this.findOne({ isDefault: true, isActive: true, deletedAt: null });
};
