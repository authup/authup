/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert, BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Client, Realm } from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';

@Entity({ name: 'auth_clients' })
@Unique(['name', 'realm_id'])
export class ClientEntity implements Client {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'boolean',
        default: true,
    })
        active: boolean;

    @Column({
        type: 'boolean',
        default: false,
    })
        built_in: boolean;

    @Column({
        type: 'boolean',
        default: false,
    })
        is_confidential: boolean;

    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 256,
        select: false,
        nullable: true,
    })
        secret: string | null;

    @Column({
        type: 'boolean',
        default: false,
    })
        secret_hashed: boolean;

    @Column({
        type: 'boolean',
        default: false,
    })
        secret_encrypted: boolean;

    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: string;

    @UpdateDateColumn()
        updated_at: string;

    // ------------------------------------------------------------------

    @Column()
        realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity;

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
