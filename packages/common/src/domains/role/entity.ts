/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { RolePermission } from '../role-permission';
import { UserRole } from '../user-role';

@Entity({ name: 'roles' })
export class Role {
    @PrimaryGeneratedColumn({ unsigned: true })
        id: number;

    @Column({ type: 'varchar', length: 30 })
    @Index({ unique: true })
        name: string;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @OneToMany(() => UserRole, (userRole) => userRole.role)
        user_roles: UserRole[];

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
        role_permissions: RolePermission[];
}
