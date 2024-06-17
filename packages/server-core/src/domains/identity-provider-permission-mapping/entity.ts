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
    IdentityProviderMappingSyncMode, IdentityProviderPermissionMapping, Realm, Role,
} from '@authup/core-kit';
import { IdentityProviderEntity } from '../identity-provider';
import { PermissionEntity } from '../permission';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_identity_provider_permission_mappings' })
@Index(['provider_id', 'permission_id'], { unique: true })
export class IdentityProviderPermissionMappingEntity implements IdentityProviderPermissionMapping {
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
        permission_id: string;

    @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
        permission: Role;

    @Column({ nullable: true })
        permission_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'permission_realm_id' })
        permission_realm: RealmEntity | null;

    @Column()
        provider_id: string;

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
        provider: IdentityProviderEntity;

    @Column({ nullable: true })
        provider_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'provider_realm_id' })
        provider_realm: RealmEntity | null;
}
