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
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { IdentityProviderAttributeMapping, IdentityProviderMappingSyncMode, Realm } from '@authup/core-kit';
import { IdentityProviderEntity } from '../identity-provider/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_identity_provider_attribute_mappings' })
@Index(['providerId', 'targetName'], { unique: true })
export class IdentityProviderAttributeMappingEntity implements IdentityProviderAttributeMapping {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true, 
    })
    synchronizationMode: `${IdentityProviderMappingSyncMode}` | null;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true, 
    })
    name: string | null;

    @Column({
        type: 'varchar',
        length: 128,
        nullable: true, 
    })
    value: string | null;

    @Column({
        type: 'boolean',
        default: false, 
    })
    valueIsRegex: boolean;

    @Column({
        type: 'varchar',
        length: 64, 
    })
    targetName: string;

    @Column({
        type: 'varchar',
        length: 128,
        nullable: true, 
    })
    targetValue: string | null;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;

    // -----------------------------------------------

    @Column()
    providerId: string;

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: IdentityProviderEntity;

    @Column()
    providerRealmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_realm_id' })
    providerRealm: RealmEntity;
}
