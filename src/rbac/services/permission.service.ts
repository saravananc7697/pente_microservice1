import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../../schema/roles_and_policy/permissions.schema';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Permission.name, 'mongo')
    private permissionModel: Model<Permission>,
  ) {}

  async create(data: {
    resource: string;
    action: string;
    name: string;
    description?: string;
    permissionIdentifier?: string;
    isActive?: boolean;
  }) {
    const permission = new this.permissionModel(data);
    return permission.save();
  }

  async findAll() {
    return this.permissionModel
      .find({ deletedAt: null })
      .sort({ resource: 1, action: 1 })
      .exec();
  }

  async findById(id: string) {
    return this.permissionModel.findById(id).exec();
  }

  async findByIdentifier(identifier: string) {
    return this.permissionModel
      .findOne({ permissionIdentifier: identifier })
      .exec();
  }

  async findByResource(resource: string) {
    return this.permissionModel
      .find({ resource, isActive: true, deletedAt: null })
      .exec();
  }

  async update(id: string, data: Partial<Permission>) {
    return this.permissionModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async softDelete(id: string) {
    const permission = await this.permissionModel.findById(id);
    if (permission) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (permission as any).softDelete();
    }
    return null;
  }

  async restore(id: string) {
    const permission = await this.permissionModel.findById(id);
    if (permission) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (permission as any).restore();
    }
    return null;
  }
}
