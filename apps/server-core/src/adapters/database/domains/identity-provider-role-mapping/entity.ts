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
    IdentityProviderRoleMapping, 
    Realm,
    Role, 
} from '@authup/core-kit';
import { IdentityProviderEntity } from '../identity-provider/index.ts';
import { RoleEntity } from '../role/index.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_identity_provider_role_mappings' })
@Index(['providerId', 'roleId'], { unique: true })
export class IdentityProviderRoleMappingEntity implements IdentityProviderRoleMapping {
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

    @Column({ name: 'role_id' })
    roleId: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ name: 'role_realm_id', nullable: true })
    roleRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'role_realm_id' })
    roleRealm: RealmEntity | null;

    @Column({ name: 'provider_id' })
    providerId: string;

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: IdentityProviderEntity;

    @Column({ name: 'provider_realm_id' })
    providerRealmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_realm_id' })
    providerRealm: RealmEntity;
}
