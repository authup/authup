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

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;

    // -----------------------------------------------

    @Column()
    roleId: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ nullable: true })
    roleRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'role_realm_id' })
    roleRealm: RealmEntity | null;

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
