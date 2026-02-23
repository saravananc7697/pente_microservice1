import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Policy Schema
 * Groups multiple permissions together for easier role assignment
 */
@Schema({
  timestamps: true,
  collection: 'policy',
})
export class Policy extends Document {
  /**
   * Unique identifier for the policy (e.g., 'content-moderator', 'basic-user')
   */
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-_]+$/,
    index: true,
  })
  policyIdentifier: string;

  /**
   * Human-readable name of the policy
   */
  @Prop({
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  })
  name: string;

  /**
   * Detailed description of the policy's purpose
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  description?: string;

  /**
   * Array of permission IDs associated with this policy
   */
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Permission' }],
    default: [],
    validate: {
      validator: function (v: Types.ObjectId[]) {
        return v.length >= 0;
      },
      message: 'Permissions must be a valid array',
    },
  })
  permissions: Types.ObjectId[];

  /**
   * Priority level for policy resolution (higher takes precedence)
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  })
  priority: number;

  /**
   * Whether this policy is currently active
   */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  /**
   * Whether this is a system-defined policy (cannot be deleted)
   */
  @Prop({ type: Boolean, default: false })
  isSystem: boolean;

  /**
   * Soft delete timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * Category/group for organizing policies
   */
  @Prop({
    type: String,
    trim: true,
    enum: ['user', 'admin', 'moderator', 'custom'],
    default: 'custom',
    index: true,
  })
  category: string;

  /**
   * Additional metadata for the policy
   */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

// Compound indexes for efficient querying
PolicySchema.index({ isActive: 1, deletedAt: 1 });
PolicySchema.index({ category: 1, isActive: 1 });
PolicySchema.index({ priority: -1 });

// Virtual for permission count
PolicySchema.virtual('permissionCount').get(function () {
  return this.permissions?.length || 0;
});

// Method to soft delete (prevent deletion of system policies)
PolicySchema.methods.softDelete = function () {
  if ((this as Policy).isSystem) {
    throw new Error('Cannot delete system policies');
  }
  (this as Policy).deletedAt = new Date();
  (this as Policy).isActive = false;
  return (this as Policy).save();
};

// Method to restore
PolicySchema.methods.restore = function () {
  (this as Policy).deletedAt = undefined;
  (this as Policy).isActive = true;
  return (this as Policy).save();
};

// Method to add permission
PolicySchema.methods.addPermission = function (permissionId: Types.ObjectId) {
  if (!(this as Policy).permissions.includes(permissionId)) {
    (this as Policy).permissions.push(permissionId);
  }
  return (this as Policy).save();
};

// Method to remove permission
PolicySchema.methods.removePermission = function (
  permissionId: Types.ObjectId,
) {
  (this as Policy).permissions = (this as Policy).permissions.filter(
    (id) => id.toString() !== permissionId.toString(),
  );
  return (this as Policy).save();
};
