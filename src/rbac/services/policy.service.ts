import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Policy } from '../../schema/roles_and_policy/policy.schema';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel(Policy.name, 'mongo')
    private policyModel: Model<Policy>,
  ) {}

  async create(data: {
    policyIdentifier: string;
    name: string;
    description?: string;
    permissions?: string[];
    priority?: number;
    category?: string;
  }) {
    const permissionIds = data.permissions?.map((id) => new Types.ObjectId(id));
    const policy = new this.policyModel({
      ...data,
      permissions: permissionIds || [],
    });
    return policy.save();
  }

  async findAll() {
    return this.policyModel
      .find({ deletedAt: null })
      .populate('permissions')
      .sort({ priority: -1 })
      .exec();
  }

  async findById(id: string) {
    return this.policyModel.findById(id).populate('permissions').exec();
  }

  async findByIdentifier(identifier: string) {
    return this.policyModel
      .findOne({ policyIdentifier: identifier })
      .populate('permissions')
      .exec();
  }

  async findByCategory(category: string) {
    return this.policyModel
      .find({ category, isActive: true, deletedAt: null })
      .populate('permissions')
      .exec();
  }

  async update(
    id: string,
    data: Omit<Partial<Policy>, 'permissions'> & { permissions?: string[] },
  ) {
    const updateData: any = { ...data };
    if (data.permissions) {
      updateData.permissions = data.permissions.map(
        (id) => new Types.ObjectId(id),
      );
    }
    return this.policyModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('permissions')
      .exec();
  }

  async addPermission(policyId: string, permissionId: string) {
    const policy = await this.policyModel.findById(policyId);
    if (policy) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (policy as any).addPermission(new Types.ObjectId(permissionId));
    }
    return null;
  }

  async removePermission(policyId: string, permissionId: string) {
    const policy = await this.policyModel.findById(policyId);
    if (policy) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (policy as any).removePermission(new Types.ObjectId(permissionId));
    }
    return null;
  }

  async softDelete(id: string) {
    const policy = await this.policyModel.findById(id);
    if (policy) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (policy as any).softDelete();
    }
    return null;
  }

  async restore(id: string) {
    const policy = await this.policyModel.findById(id);
    if (policy) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return (policy as any).restore();
    }
    return null;
  }
}
