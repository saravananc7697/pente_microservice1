import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Permission,
  PermissionSchema,
} from '../schema/roles_and_policy/permissions.schema';
import { Policy, PolicySchema } from '../schema/roles_and_policy/policy.schema';
import { Role, RoleSchema } from '../schema/roles_and_policy/roles.schema';
import {
  UserRole,
  UserRoleSchema,
} from '../schema/roles_and_policy/user_roles.schema';
import { AdminUser } from '../entity/admin-user.entity';
import { PermissionService } from './services/permission.service';
import { PolicyService } from './services/policy.service';
import { RoleService } from './services/role.service';
import { UserRoleService } from './services/user-role.service';
import { RbacController } from './rbac.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]),
    MongooseModule.forFeature(
      [
        { name: Permission.name, schema: PermissionSchema },
        { name: Policy.name, schema: PolicySchema },
        { name: Role.name, schema: RoleSchema },
        { name: UserRole.name, schema: UserRoleSchema },
      ],
      'mongo',
    ),
  ],
  controllers: [RbacController],
  providers: [PermissionService, PolicyService, RoleService, UserRoleService],
  exports: [PermissionService, PolicyService, RoleService, UserRoleService],
})
export class RbacModule {}
