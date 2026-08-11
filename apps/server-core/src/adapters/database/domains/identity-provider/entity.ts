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
    IdentityProvider,
    IdentityProviderPreset,
    IdentityProviderProtocol,
    Realm,
} from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Unique(['name', 'realmId'])
@Entity({ name: 'auth_identity_providers' })
export class IdentityProviderEntity implements IdentityProvider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @Index()
    @Column({
        type: 'varchar',
        length: 64,
        nullable: true, 
    })
    protocol: `${IdentityProviderProtocol}` | null;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true, 
    })
    preset: `${IdentityProviderPreset}` | null;

    @Index()
    @Column({
        type: 'boolean',
        default: true, 
    })
    enabled: boolean;

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    @Index()
    @Column({ name: 'realm_id' })
    realmId: string;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm;
}
