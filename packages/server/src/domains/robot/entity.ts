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
    Entity, Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import {
    MASTER_REALM_ID, Realm, Robot, User, createNanoID,
} from '@typescript-auth/domains';
import { RealmEntity } from '../realm';
import { UserEntity } from '../user';

@Entity({ name: 'auth_robots' })
export class RobotEntity implements Robot {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 256, select: false })
        secret: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 128 })
        name: string;

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
        user_id: string | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
        user: User | null;

    @Column({ default: MASTER_REALM_ID })
        realm_id: string;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

    // ------------------------------------------------------------------

    @BeforeUpdate()
    @BeforeInsert()
    setName() {
        if (!this.name || this.name.length === 0) {
            this.name = createNanoID(undefined, 36);
        }
    }
}
