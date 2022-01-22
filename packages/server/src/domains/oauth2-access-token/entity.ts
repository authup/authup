/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Oauth2Client, Robot, User } from '@typescript-auth/domains';
import { OAuth2AccessToken } from '@typescript-auth/domains/src/entities/oauth2-access-token';
import { UserEntity } from '../user';
import { RobotEntity } from '../robot';
import { OAuth2ClientEntity } from '../oauth2-client';

@Entity({ name: 'auth_access_tokens' })
export class OAuth2AccessTokenEntity implements OAuth2AccessToken {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({ type: 'varchar', length: 4096 })
        token: string;

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
        client_id: Oauth2Client['id'] | null;

    @ManyToOne(() => OAuth2ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: Oauth2Client | null;

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
}
