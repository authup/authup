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
import type { ClientScope } from '@authup/common';
import {
    Client,
    Scope,
} from '@authup/common';
import { ClientEntity } from '../client';
import { ScopeEntity } from '../scope';

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

    @Column()
        scope_id: Scope['id'];

    @ManyToOne(() => ScopeEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scope_id' })
        scope: Scope;
}
