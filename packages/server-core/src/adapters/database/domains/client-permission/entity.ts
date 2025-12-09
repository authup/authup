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
    Client,
    ClientPermission,
    Permission,
    Policy,
    Realm,
} from '@authup/core-kit';
import { PermissionEntity } from '../permission';
import { PolicyEntity } from '../policy';
import { ClientEntity } from '../client/entity';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_client_permissions' })
@Index(['client_id', 'permission_id'], { unique: true })
export class ClientPermissionEntity implements ClientPermission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    // ------------------------------------------------------------------

    @Column({ nullable: true })
        policy_id: string | null;

    @ManyToOne(() => PolicyEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'policy_id' })
        policy: Policy | null;

    @Column()
        client_id: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        client: Client;

    @Column({ nullable: true })
        client_realm_id: Client['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_realm_id' })
        client_realm: Realm | null;

    @Column({ type: 'varchar' })
        permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Permission;

    @Column({ nullable: true })
        permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'permission_realm_id' })
        permission_realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;
}
