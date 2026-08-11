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
import type {
    IdentityProviderMappingSyncMode, 
    IdentityProviderPermissionMapping,
    Realm, 
    Role, 
} from '@authup/core-kit';
import { IdentityProviderEntity } from '../identity-provider/index.ts';
import { PermissionEntity } from '../permission/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_identity_provider_permission_mappings' })
@Index(['providerId', 'permissionId'], { unique: true })
export class IdentityProviderPermissionMappingEntity implements IdentityProviderPermissionMapping {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'synchronization_mode', 
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
        name: 'value_is_regex', 
        type: 'boolean', 
        default: false, 
    })
    valueIsRegex: boolean;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // -----------------------------------------------

    @Index()
    @Column({ name: 'permission_id' })
    permissionId: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Role;

    @Index()
    @Column({ name: 'permission_realm_id', nullable: true })
    permissionRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'permission_realm_id' })
    permissionRealm: RealmEntity | null;

    @Column({ name: 'provider_id' })
    providerId: string;

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: IdentityProviderEntity;

    @Index()
    @Column({ name: 'provider_realm_id' })
    providerRealmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_realm_id' })
    providerRealm: RealmEntity;
}
