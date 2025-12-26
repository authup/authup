/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import type {
    Client, Realm, Robot, Session, User,
} from '@authup/core-kit';
import { ClientEntity } from '../client/index.ts';
import { RobotEntity } from '../robot/index.ts';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';

@Entity({ name: 'auth_sessions' })
export class SessionEntity implements Session {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Index()
    @Column({ type: 'varchar', length: 64 })
        sub: string;

    @Index()
    @Column({ type: 'varchar', length: 64 })
        sub_kind: string;

    @Index()
    @Column({ type: 'varchar', length: 15 })
        ip_address: string;

    @Index()
    @Column({ type: 'varchar', length: 512 })
        user_agent: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 28,
    })
        expires_at: string;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
    })
        refreshed_at: string | null;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
    })
        seen_at: string | null;

    @UpdateDateColumn()
        updated_at: string;

    @CreateDateColumn()
        created_at: string;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        client_id: Client['id'] | null;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: ClientEntity | null;

    @Column({ nullable: true, default: null })
        user_id: User['id'] | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
        user: UserEntity | null;

    @Column({ nullable: true, default: null })
        robot_id: Robot['id'] | null;

    @ManyToOne(() => RobotEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'robot_id' })
        robot: RobotEntity | null;

    @Column()
        realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity;
}
