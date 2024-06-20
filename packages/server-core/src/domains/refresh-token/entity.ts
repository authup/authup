/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import type {
    Client, OAuth2RefreshToken, Realm, Robot, User,
} from '@authup/core-kit';
import { ClientEntity } from '../client';
import { RobotEntity } from '../robot';
import { RealmEntity } from '../realm';
import { UserEntity } from '../user';

@Entity({ name: 'auth_refresh_tokens' })
export class OAuth2RefreshTokenEntity implements OAuth2RefreshToken {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'varchar',
        length: 28,
    })
        expires: string;

    @Column({
        type: 'varchar', length: 512, nullable: true, default: null,
    })
        scope: string | null;

    @Column({
        nullable: true, default: null, type: 'uuid',
    })
        access_token: string | null;

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
