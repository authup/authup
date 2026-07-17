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
    Realm, 
    Role, 
    User, 
    UserRole,
} from '@authup/core-kit';
import { RoleEntity } from '../role/index.ts';
import { UserEntity } from '../user/entity.ts';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_user_roles' })
@Index(['roleId', 'userId'], { unique: true })
export class UserRoleEntity implements UserRole {
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
    userId: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    userRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_realm_id' })
    userRealm: Realm | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;
}
