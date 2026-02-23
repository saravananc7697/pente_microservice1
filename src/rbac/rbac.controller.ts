import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PermissionService } from './services/permission.service';
import { PolicyService } from './services/policy.service';
import { RoleService } from './services/role.service';
import { UserRoleService } from './services/user-role.service';
import { UpdateRoleDto } from './dto/role.dto';


@ApiTags('RBAC')
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly policyService: PolicyService,
    private readonly roleService: RoleService,
    private readonly userRoleService: UserRoleService,
  ) {}

  // ============ PERMISSIONS ============
  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  createPermission(
    @Body()
    body: {
      resource: string;
      action: string;
      name: string;
      description?: string;
      permissionIdentifier?: string;
      isActive?: boolean;
    },
  ) {
    return this.permissionService.create(body);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  getAllPermissions() {
    return this.permissionService.findAll();
  }

  @Get('permissions/:id')
  @ApiOperation({ summary: 'Get permission by ID' })
  getPermission(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @Get('permissions/resource/:resource')
  @ApiOperation({ summary: 'Get permissions by resource' })
  getPermissionsByResource(@Param('resource') resource: string) {
    return this.permissionService.findByResource(resource);
  }

  @Patch('permissions/:id')
  @ApiOperation({ summary: 'Update permission by ID' })
  updatePermission(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      resource?: string;
      action?: string;
      isActive?: boolean;
    },
  ) {
    return this.permissionService.update(id, body);
  }

  @Delete('permissions/:id')
  @ApiOperation({ summary: 'Soft delete permission' })
  deletePermission(@Param('id') id: string) {
    return this.permissionService.softDelete(id);
  }

  // ============ POLICIES ============
  @Post('policies')
  @ApiOperation({ summary: 'Create a new policy' })
  createPolicy(
    @Body()
    body: {
      policyIdentifier: string;
      name: string;
      description?: string;
      permissions?: string[];
      priority?: number;
      category?: string;
      isActive?: boolean;
    },
  ) {
    return this.policyService.create(body);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get all policies' })
  getAllPolicies() {
    return this.policyService.findAll();
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get policy by ID' })
  getPolicy(@Param('id') id: string) {
    return this.policyService.findById(id);
  }

  @Patch('policies/:id')
  @ApiOperation({ summary: 'Update policy by ID' })
  updatePolicy(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      permissions?: string[];
      priority?: number;
      category?: string;
      isActive?: boolean;
    },
  ) {
    return this.policyService.update(id, body);
  }

  @Put('policies/:id/permissions/:permissionId')
  @ApiOperation({ summary: 'Add permission to policy' })
  addPermissionToPolicy(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.policyService.addPermission(id, permissionId);
  }

  @Delete('policies/:id/permissions/:permissionId')
  @ApiOperation({ summary: 'Remove permission from policy' })
  removePermissionFromPolicy(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.policyService.removePermission(id, permissionId);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Soft delete policy' })
  deletePolicy(@Param('id') id: string) {
    return this.policyService.softDelete(id);
  }
  // ============ ROLES ============
  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(
    @Body()
    body: {
      roleIdentifier: string;
      name: string;
      description?: string;
      policies?: string[];
      level?: number;
      isDefault?: boolean;
    },
  ) {
    return this.roleService.create(body);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  getAllRoles() {
    return this.roleService.findAll();
  }

  @Get('roles/default')
  @ApiOperation({ summary: 'Get default role' })
  getDefaultRole() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.roleService.getDefaultRole();
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get role by ID' })
  getRole(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Patch('roles/:roleId')
  @ApiOperation({ summary: 'Update role by ID' })
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    // Map label to name if provided
    const updateData: any = { ...updateRoleDto };
    if (updateRoleDto.label) {
      updateData.name = updateRoleDto.label;
      delete updateData.label;
    }

    const role = await this.roleService.update(roleId, updateData);
    return { data: role };
  }

  @Put('roles/:id/policies/:policyId')
  @ApiOperation({ summary: 'Add policy to role' })
  addPolicyToRole(
    @Param('id') id: string,
    @Param('policyId') policyId: string,
  ) {
    return this.roleService.addPolicy(id, policyId);
  }

  @Delete('roles/:id/policies/:policyId')
  @ApiOperation({ summary: 'Remove policy from role' })
  removePolicyFromRole(
    @Param('id') id: string,
    @Param('policyId') policyId: string,
  ) {
    return this.roleService.removePolicy(id, policyId);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Soft delete role' })
  deleteRole(@Param('id') id: string) {
    return this.roleService.softDelete(id);
  }

  // ============ USER ROLES ============
  @Post('user-roles')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @Body()
    body: {
      userId: string;
      roleId: string;
      assignedBy?: string;
      expiresAt?: Date;
      reason?: string;
    },
  ) {
    return this.userRoleService.assignRole(body);
  }

  @Get('user-roles')
  @ApiOperation({ summary: 'Get all user-role assignments' })
  getAllUserRoles() {
    return this.userRoleService.findAll();
  }

  @Get('user-roles/user/:userId')
  @ApiOperation({ summary: 'Get all roles for a user' })
  getUserRoles(@Param('userId') userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.userRoleService.getUserRoles(userId);
  }

  @Get('user-roles/role/:roleId')
  @ApiOperation({ summary: 'Get all users with a role' })
  getUsersWithRole(@Param('roleId') roleId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.userRoleService.getUsersWithRole(roleId);
  }

  @Delete('user-roles/:userId/:roleId')
  @ApiOperation({ summary: 'Revoke role from user' })
  revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body() body?: { revokedBy?: string },
  ) {
    return this.userRoleService.revokeRole(userId, roleId, body?.revokedBy);
  }

  @Put('user-roles/:userId/:roleId/extend')
  @ApiOperation({ summary: 'Extend role expiry' })
  extendRoleExpiry(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body() body: { days: number },
  ) {
    return this.userRoleService.extendExpiry(userId, roleId, body.days);
  }
}
