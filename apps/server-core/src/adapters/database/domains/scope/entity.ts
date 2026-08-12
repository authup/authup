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
import type { Realm, Scope } from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_scopes' })
@Unique(['name', 'realmId'])
export class ScopeEntity implements Scope {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
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

    @Index()
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

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

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
}
