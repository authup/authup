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
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { IdentityProvider, IdentityProviderPreset, IdentityProviderProtocol } from '@authup/core-kit';
import { Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm';

@Unique(['name', 'realm_id'])
@Entity({ name: 'auth_identity_providers' })
export class IdentityProviderEntity implements IdentityProvider {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'varchar', length: 256, nullable: true })
        display_name: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
        protocol: `${IdentityProviderProtocol}` | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
        preset: `${IdentityProviderPreset}` | null;

    @Column({ type: 'boolean', default: true })
        enabled: boolean;

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    @Index()
    @Column()
        realm_id: string;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;
}
