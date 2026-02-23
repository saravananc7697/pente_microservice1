import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TeamManagementService } from './team-management.service';
import { TeamManagementController } from './team-management.controller';
import { AdminUser } from '../entity/admin-user.entity';
import {
  UserRole,
  UserRoleSchema,
} from '../schema/roles_and_policy/user_roles.schema';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AdminUser]),
    MongooseModule.forFeature(
      [{ name: UserRole.name, schema: UserRoleSchema }],
      'mongo',
    ),
    RbacModule,
  ],
  controllers: [TeamManagementController],
  providers: [TeamManagementService],
  exports: [TeamManagementService],
})
export class TeamManagementModule {}
