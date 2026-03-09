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
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type {
    Client,
    ClientScope,
    Realm,
    Scope,
} from '@authup/core-kit';
import { ClientEntity } from '../client/index.ts';
import { RealmEntity } from '../realm/index.ts';
import { ScopeEntity } from '../scope/index.ts';

@Entity({ name: 'auth_client_scopes' })
@Unique(['client_id', 'scope_id'])
export class ClientScopeEntity implements ClientScope {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'boolean', default: false })
        default: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column()
        client_id: Client['id'];

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        client: Client;

    @Column({ nullable: true })
        client_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_realm_id' })
        client_realm: RealmEntity | null;

    // ------------------------------------------------------------------

    @Column()
        scope_id: Scope['id'];

    @ManyToOne(() => ScopeEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scope_id' })
        scope: Scope;

    @Column({ nullable: true })
        scope_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'scope_realm_id' })
        scope_realm: RealmEntity | null;
}
