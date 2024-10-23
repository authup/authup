/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createNanoID } from '@authup/kit';
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity, Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Client, Robot, User } from '@authup/core-kit';
import {
    Realm,
} from '@authup/core-kit';
import { RealmEntity } from '../realm';
import { UserEntity } from '../user';

@Entity({ name: 'auth_robots' })
@Unique(['name', 'realm_id'])
export class RobotEntity implements Robot {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 256, select: false })
        secret: string;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'varchar', length: 256, nullable: true })
        display_name: string | null;

    @Column({ type: 'text', nullable: true })
        description: string;

    @Column({ type: 'boolean', default: true })
        active: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        user_id: User['id'] | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
        user: User | null;

    // ------------------------------------------------------------------

    @Index()
    @Column({ nullable: true })
        client_id: Client['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: Client | null;

    // ------------------------------------------------------------------

    @Index()
    @Column()
        realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

    // ------------------------------------------------------------------

    @BeforeUpdate()
    @BeforeInsert()
    setName() {
        if (!this.name || this.name.length === 0) {
            this.name = createNanoID(36);
        }
    }
}
