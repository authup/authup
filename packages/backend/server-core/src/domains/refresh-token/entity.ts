/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import {
    Client, OAuth2AccessToken, OAuth2RefreshToken, Realm, Robot, User,
} from '@authelion/common';
import { OAuth2AccessTokenEntity } from '../access-token';
import { OAuth2ClientEntity } from '../client';
import { RobotEntity } from '../robot';
import { RealmEntity } from '../realm';
import { UserEntity } from '../user';

@Entity({ name: 'auth_refresh_tokens' })
export class OAuth2RefreshTokenEntity implements OAuth2RefreshToken {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'datetime',
    })
        expires: Date;

    @Column({
        type: 'varchar', length: 512, nullable: true, default: null,
    })
        scope: string | null;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        client_id: Client['id'] | null;

    @ManyToOne(() => OAuth2ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: OAuth2ClientEntity | null;

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

    @Column({ nullable: true, default: null })
        access_token_id: OAuth2AccessToken['id'] | null;

    @ManyToOne(() => OAuth2AccessTokenEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'access_token_id' })
        access_token: OAuth2AccessTokenEntity | null;

    @Column()
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity;
}
