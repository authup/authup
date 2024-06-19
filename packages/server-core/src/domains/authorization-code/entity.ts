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
    Client, OAuth2AuthorizationCode, Realm, Robot,
    User,
} from '@authup/core-kit';
import { UserEntity } from '../user';
import { RobotEntity } from '../robot';
import { ClientEntity } from '../client';
import { RealmEntity } from '../realm';

@Entity({ name: 'auth_authorization_codes' })
export class OAuth2AuthorizationCodeEntity implements OAuth2AuthorizationCode {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'varchar',
        length: 4096,
        select: false,
    })
        content: string;

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
        client_id: Client['id'] | null;

    @ManyToOne(() => ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: Client | null;

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
