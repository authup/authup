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
import type {
    Client, ClientRole, Realm, Role,
} from '@authup/core-kit';
import { RoleEntity } from '../role';
import { ClientEntity } from '../client/entity';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_client_roles' })
@Index(['role_id', 'client_id'], { unique: true })
export class ClientRoleEntity implements ClientRole {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    // ------------------------------------------------------------------

    @Column()
        role_id: string;

    @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
        role: Role;

    @Column({ nullable: true })
        role_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'role_realm_id' })
        role_realm: Realm | null;

    @Column()
        client_id: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
        client: Client;

    @Column({ nullable: true })
        client_realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_realm_id' })
        client_realm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;
}
