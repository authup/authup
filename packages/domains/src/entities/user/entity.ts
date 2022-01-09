/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BeforeInsert, BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity, Index, JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Realm } from '../realm';

@Entity({ name: 'auth_users' })
export class User {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 128 })
    @Index({ unique: true })
        name: string;

    @Column({ type: 'boolean', default: true })
        name_locked: boolean;

    @Column({ type: 'varchar', length: 128, nullable: true })
        first_name: string;

    @Column({ type: 'varchar', length: 128, nullable: true })
        last_name: string;

    @Column({ type: 'varchar', length: 128 })
        display_name: string;

    @Column({
        type: 'varchar', length: 256, default: null, nullable: true, select: false,
    })
        email: string;

    @Column({
        type: 'varchar', length: 512, default: null, nullable: true, select: false,
    })
        password: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar', length: 256, nullable: true, default: true,
    })
        reset_hash: string | null;

    @Column({
        type: 'datetime', nullable: true, default: null,
    })
        reset_at: Date | null;

    @Column({
        type: 'datetime', nullable: true, default: null,
    })
        reset_expires: Date | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar', length: 256, nullable: true, default: true,
    })
        status: string | null;

    @Column({
        type: 'varchar', length: 256, nullable: true, default: true,
    })
        status_message: string | null;

    // ------------------------------------------------------------------

    @Column({
        type: 'boolean', default: false,
    })
        active: boolean;

    @Column({
        type: 'varchar', length: 256, nullable: true, default: true,
    })
        activate_hash: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column()
        realm_id: string;

    @ManyToOne(() => Realm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

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
