/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type { Realm, User } from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_users' })
@Unique(['name', 'realmId'])
export class UserEntity implements User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 128, 
    })
    name: string;

    @Column({
        name: 'name_locked', 
        type: 'boolean', 
        default: true, 
    })
    nameLocked: boolean;

    @Column({
        name: 'first_name', 
        type: 'varchar', 
        length: 128, 
        nullable: true, 
    })
    firstName: string | null;

    @Column({
        name: 'last_name', 
        type: 'varchar', 
        length: 128, 
        nullable: true, 
    })
    lastName: string | null;

    @Index()
    @Column({
        name: 'display_name', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
    })
    displayName: string | null;

    @Index()
    @Column({
        type: 'varchar',
        length: 256,
        select: false,
    })
    email: string;

    @Column({
        type: 'varchar',
        length: 512,
        default: null,
        nullable: true,
        select: false,
    })
    password: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true, 
    })
    avatar: string | null;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true, 
    })
    cover: string | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        name: 'reset_hash',
        type: 'varchar',
        length: 256,
        nullable: true,
        default: null,
        select: false,
    })
    resetHash: string | null;

    @Column({
        name: 'reset_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
        select: false, 
    })
    resetAt: string | null;

    @Column({
        name: 'reset_expires', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
        select: false, 
    })
    resetExpires: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 256,
        nullable: true,
        default: null,
    })
    status: string | null;

    @Column({
        name: 'status_message', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
        default: null, 
    })
    statusMessage: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'boolean',
        default: true,
    })
    active: boolean;

    @Index()
    @Column({
        name: 'activate_hash',
        type: 'varchar',
        length: 256,
        nullable: true,
        default: null,
        select: false,
    })
    activateHash: string | null;

    // ------------------------------------------------------------------

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: Realm;

    // ------------------------------------------------------------------

    @BeforeInsert()
    @BeforeUpdate()
    setDisplayName() {
        if (
            typeof this.displayName !== 'string' ||
            this.displayName.length === 0
        ) {
            this.displayName = this.name;
        }
    }
}
