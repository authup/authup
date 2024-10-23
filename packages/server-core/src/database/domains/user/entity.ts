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
import type { Client, User } from '@authup/core-kit';
import { Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_users' })
@Unique(['name', 'realm_id'])
export class UserEntity implements User {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Index()
    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'boolean', default: true })
        name_locked: boolean;

    @Column({ type: 'varchar', length: 128, nullable: true })
        first_name: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
        last_name: string | null;

    @Column({ type: 'varchar', length: 256, nullable: true })
        display_name: string | null;

    @Index()
    @Column({
        type: 'varchar', length: 256, default: null, nullable: true, select: false,
    })
        email: string | null;

    @Column({
        type: 'varchar', length: 512, default: null, nullable: true, select: false,
    })
        password: string | null;

    // ------------------------------------------------------------------

    @Column({ type: 'varchar', length: 255, nullable: true })
        avatar: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
        cover: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar', length: 256, nullable: true, default: null, select: false,
    })
        reset_hash: string | null;

    @Column({
        type: 'varchar', length: 28, nullable: true, default: null, select: false,
    })
        reset_at: string | null;

    @Column({
        type: 'varchar', length: 28, nullable: true, default: null, select: false,
    })
        reset_expires: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar', length: 256, nullable: true, default: null,
    })
        status: string | null;

    @Column({
        type: 'varchar', length: 256, nullable: true, default: null,
    })
        status_message: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'boolean', default: true,
    })
        active: boolean;

    @Column({
        type: 'varchar', length: 256, nullable: true, default: null, select: false,
    })
        activate_hash: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Index()
    @Column()
        realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

    // ------------------------------------------------------------------

    @Index()
    @Column({ nullable: true })
        client_id: Client['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: Client | null;

    // ------------------------------------------------------------------

    @BeforeInsert()
    @BeforeUpdate()
    setDisplayName() {
        if (
            typeof this.display_name !== 'string' ||
            this.display_name.length === 0
        ) {
            this.display_name = this.name;
        }
    }
}
