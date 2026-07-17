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
    Client, 
    ClientRole, 
    Realm, 
    Role,
} from '@authup/core-kit';
import { RoleEntity } from '../role/index.ts';
import { ClientEntity } from '../client/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_client_roles' })
@Index(['roleId', 'clientId'], { unique: true })
export class ClientRoleEntity implements ClientRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // ------------------------------------------------------------------

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
    roleRealm: Realm | null;

    @Column()
    clientId: string;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column({ nullable: true })
    clientRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_realm_id' })
    clientRealm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;
}
