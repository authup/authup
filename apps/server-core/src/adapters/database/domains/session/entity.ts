/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, 
    CreateDateColumn, 
    Entity, 
    Index, 
    JoinColumn, 
    ManyToOne, 
    PrimaryGeneratedColumn, 
    UpdateDateColumn,
} from 'typeorm';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import type {
    Client,
    Realm,
    Robot,
    Session,
    SessionAuthMethod,
    User,
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
    @Column({
        type: 'varchar',
        length: 64, 
    })
    sub: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 64, 
    })
    subKind: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 45,
    })
    ipAddress: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 512, 
    })
    userAgent: string;

    // ------------------------------------------------------------------

    @Column({
        type: 'varchar',
        length: 28,
    })
    expiresAt: string;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
    })
    refreshedAt: string | null;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
    })
    seenAt: string | null;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
    })
    mfaAt: string | null;

    @Column({
        type: 'varchar',
        length: 16,
        nullable: true,
    })
    authMethod: `${SessionAuthMethod}` | null;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    // ------------------------------------------------------------------

    @Column({
        nullable: true,
        default: null, 
    })
    clientId: Client['id'] | null;

    @ManyToOne(() => ClientEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'client_id' })
    client: ClientEntity | null;

    @Column({
        nullable: true,
        default: null, 
    })
    userId: User['id'] | null;

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity | null;

    @Column({
        nullable: true,
        default: null, 
    })
    robotId: Robot['id'] | null;

    @ManyToOne(() => RobotEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'robot_id' })
    robot: RobotEntity | null;

    @Column()
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
