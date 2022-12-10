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
    PrimaryGeneratedColumn, Unique,
    UpdateDateColumn,
} from 'typeorm';
import {
    IdentityProvider, IdentityProviderProtocol, IdentityProviderProtocolConfig, Realm,
} from '@authup/common';
import { RealmEntity } from '../realm';

@Unique(['slug', 'realm_id'])
@Entity({ name: 'auth_identity_providers' })
export class IdentityProviderEntity implements IdentityProvider {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 36 })
        slug: string;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'varchar', length: 64 })
        protocol: `${IdentityProviderProtocol}`;

    @Column({ type: 'varchar', length: 64, nullable: true })
        protocol_config: `${IdentityProviderProtocolConfig}` | null;

    @Column({ type: 'boolean', default: true })
        enabled: boolean;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    @Column()
        realm_id: string;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;
}
