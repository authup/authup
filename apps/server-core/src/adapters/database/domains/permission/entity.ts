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
import type { DecisionStrategy } from '@authup/kit';
import type { Client, Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';
import { ClientEntity } from '../client/entity.ts';

@Unique(['name', 'clientId', 'realmId'])
@Entity({ name: 'auth_permissions' })
export class PermissionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'built_in', 
        type: 'boolean', 
        default: false, 
    })
    builtIn: boolean;

    @Column({
        type: 'varchar',
        length: 128, 
    })
    name: string;

    @Column({
        name: 'display_name', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
    })
    displayName: string | null;

    @Column({
        type: 'text',
        nullable: true, 
    })
    description: string | null;

    @Column({
        name: 'decision_strategy', 
        type: 'varchar', 
        length: 50, 
        nullable: true, 
        default: null, 
    })
    decisionStrategy: `${DecisionStrategy}` | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'client_id', nullable: true })
    clientId: Client['id'] | null;

    @ManyToOne(() => ClientEntity, {
        onDelete: 'SET NULL',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_id' })
    client: Client | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'realm_id', nullable: true })
    realmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;
}
