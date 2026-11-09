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
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type {
    Client,
    ClientTokenExchangeCapability,
    ClientTokenExchangeRealmScope,
    Realm,
} from '@authup/core-kit';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import { ClientEntity } from '../client/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_client_token_exchange_capabilities' })
@Unique(['clientId', 'audience'])
export class ClientTokenExchangeCapabilityEntity implements ClientTokenExchangeCapability {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 256 })
    audience: string;

    @Column({ type: 'text' })
    value: string;

    @Column({ name: 'token_max_age', type: 'int' })
    tokenMaxAge: number;

    @Column({
        name: 'realm_scope',
        type: 'varchar',
        length: 16,
        default: 'own',
    })
    realmScope: `${ClientTokenExchangeRealmScope}`;

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
    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
