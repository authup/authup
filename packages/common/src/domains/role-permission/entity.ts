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
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Permission } from '../permission';
import { Role } from '../role';

@Entity({ name: 'auth_role_permissions' })
@Index(['permission_id', 'role_id'], { unique: true })
export class RolePermission {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ type: 'int', default: 999 })
        power: number;

    @Column({ type: 'json', nullable: true, default: null })
        condition: any | null;

    @Column({ type: 'json', nullable: true, default: null })
        fields: string[] | null;

    @Column({ type: 'boolean', default: false })
        negation: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ type: 'int', unsigned: true })
        role_id: number;

    @ManyToOne(() => Role, (role) => role.role_permissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => Permission, (permission) => permission.role_permissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;
}
