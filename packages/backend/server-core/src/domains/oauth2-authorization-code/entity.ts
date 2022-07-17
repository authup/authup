/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryColumn,
} from 'typeorm';
import {
    OAuth2AuthorizationCode, OAuth2Client, Realm, Robot,
    User,
} from '@authelion/common';
import { UserEntity } from '../user';
import { RobotEntity } from '../robot';
import { OAuth2ClientEntity } from '../oauth2-client';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_authorization_codes' })
export class OAuth2AuthorizationCodeEntity implements OAuth2AuthorizationCode {
    @PrimaryColumn({ type: 'uuid' })
        id: string;

    @Column({
        type: 'varchar',
        length: 4096,
        select: false,
    })
        content: string;

    @Column({
        type: 'datetime',
    })
        expires: Date;

    @Column({
        type: 'varchar', length: 512, nullable: true, default: null,
    })
        scope: string | null;

    @Column({
        type: 'varchar', length: 2000, nullable: true, default: null,
    })
        redirect_uri: string | null;

    @Column({
        type: 'varchar',
        length: 1000,
        nullable: true,
    })
        id_token: string | null;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        client_id: OAuth2Client['id'] | null;

    @ManyToOne(() => OAuth2ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: OAuth2Client | null;

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
        realm_id: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: RealmEntity;
}
