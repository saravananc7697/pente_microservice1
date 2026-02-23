import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AdminUserType {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

export enum AdminUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'admin_users' })
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userSub: string;

  @Column({
    type: 'enum',
    enum: AdminUserType,
    default: AdminUserType.ADMIN,
  })
  adminUserType: AdminUserType;

  @Column({
    type: 'enum',
    enum: AdminUserStatus,
    default: AdminUserStatus.ACTIVE,
  })
  adminUserStatus: AdminUserStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
