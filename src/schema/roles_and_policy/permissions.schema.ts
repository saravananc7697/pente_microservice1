import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Permission Schema
 * Defines granular access permissions that can be assigned to policies
 */
@Schema({
  timestamps: true,
  collection: 'permissions',
})
export class Permission extends Document {
  /**
   * Unique identifier for the permission (e.g., 'user:create', 'post:delete')
   * Format: resource:action
   */
  @Prop({
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z_]+:[a-z_]+$/,
    index: true,
  })
  permissionIdentifier: string;

  /**
   * Human-readable name of the permission
   */
  @Prop({
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  })
  name: string;

  /**
   * Detailed description of what this permission allows
   */
  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  description?: string;

  /**
   * Resource type this permission applies to (e.g., 'user', 'post', 'comment')
   */
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  resource: string;

  /**
   * Action this permission allows (e.g., 'create', 'read', 'update', 'delete')
   */
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    enum: ['create', 'read', 'update', 'delete', 'list', 'manage'],
  })
  action: string;

  /**
   * Whether this permission is currently active
   */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  /**
   * Soft delete timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * Additional metadata for the permission
   */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Compound index for efficient querying by resource and action
PermissionSchema.index({ resource: 1, action: 1 });

// Index for active permissions only
PermissionSchema.index({ isActive: 1, deletedAt: 1 });

// Pre-save hook to auto-generate permissionIdentifier
PermissionSchema.pre('save', function () {
  if (!this.permissionIdentifier && this.resource && this.action) {
    this.permissionIdentifier = `${this.resource}:${this.action}`;
  }
});

// Method to soft delete
PermissionSchema.methods.softDelete = function () {
  (this as Permission).deletedAt = new Date();
  (this as Permission).isActive = false;
  return (this as Permission).save();
};

// Method to restore
PermissionSchema.methods.restore = function () {
  (this as Permission).deletedAt = undefined;
  (this as Permission).isActive = true;
  return (this as Permission).save();
};
