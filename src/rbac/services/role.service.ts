import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../../schema/roles_and_policy/roles.schema';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name, 'mongo')
    private roleModel: Model<Role>,
  ) {}

  async create(data: {
    roleIdentifier: string;
    name: string;
    description?: string;
    policies?: string[];
    level?: number;
    isDefault?: boolean;
    isSystem?: boolean;
  }) {
    const policyIds = data.policies?.map((id) => new Types.ObjectId(id));
    const role = new this.roleModel({
      ...data,
      policies: policyIds || [],
    });
    return role.save();
  }

  async findAll() {
    return this.roleModel
      .find({ deletedAt: null })
      .populate({
        path: 'policies',
        populate: { path: 'permissions' },
      })
      .sort({ level: -1 })
      .exec();
  }

  async findById(id: string) {
    return this.roleModel
      .findById(id)
      .populate({
        path: 'policies',
        populate: { path: 'permissions' },
      })
      .exec();
  }

  async findByIdentifier(identifier: string) {
    return this.roleModel
      .findOne({ roleIdentifier: identifier })
      .populate({
        path: 'policies',
        populate: { path: 'permissions' },
      })
      .exec();
  }

  getDefaultRole() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (this.roleModel as any).getDefaultRole();
  }

  async update(id: string, data: Partial<Role>) {
    return this.roleModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate({
        path: 'policies',
        populate: { path: 'permissions' },
      })
      .exec();
  }

  async addPolicy(roleId: string, policyId: string) {
    const role = await this.roleModel.findById(roleId);
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (role as any).addPolicy(new Types.ObjectId(policyId));
    }
    return null;
  }

  async removePolicy(roleId: string, policyId: string) {
    const role = await this.roleModel.findById(roleId);
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (role as any).removePolicy(new Types.ObjectId(policyId));
    }
    return null;
  }

  async softDelete(id: string) {
    const role = await this.roleModel.findById(id);
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (role as any).softDelete();
    }
    return null;
  }

  async restore(id: string) {
    const role = await this.roleModel.findById(id);
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (role as any).restore();
    }
    return null;
  }
}
