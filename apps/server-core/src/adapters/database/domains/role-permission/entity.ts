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
    Role,
    RolePermission,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy/index.ts';
import { RoleEntity } from '../role/entity.ts';
import { PermissionEntity } from '../permission/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_role_permissions' })
@Index(['permissionId', 'roleId'], { unique: true })
export class RolePermissionEntity implements RolePermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Column({ nullable: true })
    policyId: string | null;

    @ManyToOne(() => PolicyEntity, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'policy_id' })
    policy: Policy | null;

    @Column({
        type: 'varchar',
        length: 50,
        default: 'own',
    })
    realmScope: RealmScopeValue;

    @Column()
    roleId: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ nullable: true })
    roleRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'role_realm_id' })
    roleRealm: Realm | null;

    @Column()
    permissionId: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;

    @Column({ nullable: true })
    permissionRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'permission_realm_id' })
    permissionRealm: Realm | null;
}
