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
    Client,
    ClientPermission,
    Permission,
    Policy,
    Realm,
    RealmScopeValue,
} from '@authup/core-kit';
import { PermissionEntity } from '../permission/index.ts';
import { PolicyEntity } from '../policy/index.ts';
import { ClientEntity } from '../client/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_client_permissions' })
@Index(['clientId', 'permissionId'], { unique: true })
export class ClientPermissionEntity implements ClientPermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------

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

    @Column({ name: 'client_id' })
    clientId: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column({ name: 'client_realm_id', nullable: true })
    clientRealmId: Client['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_realm_id' })
    clientRealm: Realm | null;

    @Column({ name: 'permission_id', type: 'varchar' })
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

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
