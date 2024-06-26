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
import {
    IdentityProviderMappingSyncMode, IdentityProviderRoleMapping, Realm, Role,
} from '@authup/core-kit';
import { IdentityProviderEntity } from '../identity-provider';
import { RoleEntity } from '../role';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_identity_provider_role_mappings' })
@Index(['provider_id', 'role_id'], { unique: true })
export class IdentityProviderRoleMappingEntity implements IdentityProviderRoleMapping {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
        synchronization_mode: `${IdentityProviderMappingSyncMode}` | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
        name: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
        value: string | null;

    @Column({ type: 'boolean', default: false })
        value_is_regex: boolean;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // -----------------------------------------------

    @Column()
        role_id: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column({ nullable: true })
        role_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'role_realm_id' })
        role_realm: RealmEntity | null;

    @Column()
        provider_id: string;

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
        provider: IdentityProviderEntity;

    @Column()
        provider_realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_realm_id' })
        provider_realm: RealmEntity;
}
