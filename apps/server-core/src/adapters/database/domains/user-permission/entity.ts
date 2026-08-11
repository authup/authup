/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, 
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type {
    Permission,
    Policy,
    Realm,
    RealmScopeValue,
    User,
    UserPermission,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy/index.ts';
import { UserEntity } from '../user/entity.ts';
import { PermissionEntity } from '../permission/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_user_permissions' })
@Index(['permissionId', 'userId'], { unique: true })
export class UserPermissionEntity implements UserPermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'policy_id', nullable: true })
    policyId: string | null;

    @ManyToOne(() => PolicyEntity, {
        onDelete: 'SET NULL',
        nullable: true, 
    })
    @JoinColumn({ name: 'policy_id' })
    policy: Policy | null;

    @Column({
        name: 'realm_scope', 
        type: 'varchar', 
        length: 50, 
        default: 'own', 
    })
    realmScope: RealmScopeValue;

    @Index()
    @Column({ name: 'user_id' })
    userId: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Index()
    @Column({ name: 'user_realm_id', nullable: true })
    userRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_realm_id' })
    userRealm: Realm | null;

    @Column({ name: 'permission_id' })
    permissionId: Permission['id'];

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;

    @Index()
    @Column({ name: 'permission_realm_id', nullable: true })
    permissionRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'permission_realm_id' })
    permissionRealm: Realm | null;
}
