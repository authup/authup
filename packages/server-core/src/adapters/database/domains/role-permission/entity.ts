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
import type {
    Permission,
    Policy,
    Realm,
    Role,
    RolePermission,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy';
import { RoleEntity } from '../role/entity';
import { PermissionEntity } from '../permission';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_role_permissions' })
@Index(['permission_id', 'role_id'], { unique: true })
export class RolePermissionEntity implements RolePermission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ nullable: true })
        policy_id: string | null;

    @ManyToOne(() => PolicyEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'policy_id' })
        policy: Policy | null;

    @Column()
        role_id: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column({ nullable: true })
        role_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'role_realm_id' })
        role_realm: Realm | null;

    @Column()
        permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;

    @Column({ nullable: true })
        permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'permission_realm_id' })
        permission_realm: Realm | null;
}
