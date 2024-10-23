/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Client, Realm, User } from '@authup/core-kit';
import { UserEntity } from '../user';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_clients' })
@Unique(['name', 'realm_id'])
export class ClientEntity implements Client {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'boolean',
        default: false,
    })
        built_in: boolean;

    @Column({
        type: 'varchar',
        length: 256,
    })
        name: string;

    @Column({ type: 'varchar', length: 256, nullable: true })
        display_name: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
        description: string | null;

    @Column({
        type: 'varchar',
        length: 256,
        select: false,
        nullable: true,
    })
        secret: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
        redirect_uri: string | null;

    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
    })
        grant_types: string | null;

    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
        default: null,
    })
        scope: string | null;

    @Column({
        type: 'varchar',
        length: 2000,
        nullable: true,
    })
        base_url: string | null;

    @Column({
        type: 'varchar',
        length: 2000,
        nullable: true,
    })
        root_url: string | null;

    @Column({
        type: 'boolean',
        default: false,
    })
        is_confidential: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ nullable: true })
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity | null;

    @Column({ nullable: true })
        user_id: User['id'] | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
        user: UserEntity | null;
}
