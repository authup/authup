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
@Index(['permission_id', 'policy_id'], { unique: true })
export class PermissionPolicyEntity implements PermissionPolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn()
    created_at: string;

    @UpdateDateColumn()
    updated_at: string;

    // ------------------------------------------------------------------

    @Column()
    permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;

    @Column({ nullable: true })
    permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'permission_realm_id' })
    permission_realm: Realm | null;

    // ------------------------------------------------------------------

    @Column()
    policy_id: string;

    @ManyToOne(() => PolicyEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'policy_id' })
    policy: Policy;

    @Column({ nullable: true })
    policy_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'policy_realm_id' })
    policy_realm: Realm | null;
}
