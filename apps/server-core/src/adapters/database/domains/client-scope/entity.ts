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
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
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
@Unique(['clientId', 'scopeId'])
export class ClientScopeEntity implements ClientScope {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({
        type: 'boolean',
        default: false, 
    })
    default: boolean;

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Column({ name: 'client_id' })
    clientId: Client['id'];

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Index()
    @Column({ name: 'client_realm_id', nullable: true })
    clientRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_realm_id' })
    clientRealm: RealmEntity | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'scope_id' })
    scopeId: Scope['id'];

    @ManyToOne(() => ScopeEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scope_id' })
    scope: Scope;

    @Index()
    @Column({ name: 'scope_realm_id', nullable: true })
    scopeRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'scope_realm_id' })
    scopeRealm: RealmEntity | null;
}
