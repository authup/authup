/*
 * Copyright (c) 2026.
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
    PermissionPolicy, 
    Policy, 
    Realm,
} from '@authup/core-kit';
import { PermissionEntity } from '../permission/index.ts';
import { PolicyEntity } from '../policy/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_permission_policies' })
@Index(['permissionId', 'policyId'], { unique: true })
export class PermissionPolicyEntity implements PermissionPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Column({ name: 'permission_id' })
    permissionId: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;

    @Column({ name: 'permission_realm_id', nullable: true })
    permissionRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'permission_realm_id' })
    permissionRealm: Realm | null;

    // ------------------------------------------------------------------

    @Column({ name: 'policy_id' })
    policyId: string;

    @ManyToOne(() => PolicyEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'policy_id' })
    policy: Policy;

    @Column({ name: 'policy_realm_id', nullable: true })
    policyRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'policy_realm_id' })
    policyRealm: Realm | null;
}
