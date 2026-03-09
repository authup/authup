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
    User, UserPermission,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy/index.ts';
import { UserEntity } from '../user/entity.ts';
import { PermissionEntity } from '../permission/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_user_permissions' })
@Index(['permission_id', 'user_id'], { unique: true })
export class UserPermissionEntity implements UserPermission {
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
        user_id: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;

    @Column({ nullable: true })
        user_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_realm_id' })
        user_realm: Realm | null;

    @Column()
        permission_id: Permission['id'];

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;

    @Column({ nullable: true })
        permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'permission_realm_id' })
        permission_realm: Realm | null;
}
