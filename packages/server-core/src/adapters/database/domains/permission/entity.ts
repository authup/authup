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
    PrimaryGeneratedColumn, Unique,
    UpdateDateColumn,
} from 'typeorm';
import type {
    Client, Permission, Policy, Realm,
} from '@authup/core-kit';
import { PolicyEntity } from '../policy';
import { RealmEntity } from '../realm';
import { ClientEntity } from '../client/entity';

@Unique(['name', 'client_id', 'realm_id'])
@Entity({ name: 'auth_permissions' })
export class PermissionEntity implements Permission {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'boolean', default: false })
        built_in: boolean;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'varchar', length: 256, nullable: true })
        display_name: string | null;

    @Column({ type: 'text', nullable: true })
        description: string | null;

    // ------------------------------------------------------------------

    @Column({ type: 'varchar', nullable: true })
        policy_id: Policy['id'] | null;

    @ManyToOne(() => PolicyEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'policy_id' })
        policy: Policy | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ nullable: true })
        client_id: Client['id'] | null;

    @ManyToOne(() => ClientEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: Client | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ nullable: true })
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
