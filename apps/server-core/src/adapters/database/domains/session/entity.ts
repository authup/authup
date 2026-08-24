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
    Session,
    SessionAuthMethod,
    User,
} from '@authup/core-kit';
import { ClientEntity } from '../client/index.ts';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';

@Index(['userId', 'seenAt'])
@Index(['realmId', 'seenAt'])
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
        name: 'sub_kind', 
        type: 'varchar', 
        length: 64, 
    })
    subKind: string;

    /**
     * The opaque credential a console browser presents (plan 088). Unique so
     * one handle resolves at most one session, nullable because every
     * bearer-mode session has none, and `select: false` so it stays in the
     * same class as `user.password` / `key.decryptionKey`: re-selected only by
     * `ISessionRepository.findOneBySecret`, never on an ordinary session read.
     */
    @Index({ unique: true })
    @Column({
        name: 'secret',
        type: 'varchar',
        length: 64,
        nullable: true,
        default: null,
        select: false,
    })
    secret: string | null;

    @Index()
    @Column({
        name: 'ip_address',
        type: 'varchar', 
        length: 45, 
    })
    ipAddress: string;

    @Index()
    @Column({
        name: 'user_agent', 
        type: 'varchar', 
        length: 512, 
    })
    userAgent: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        name: 'expires_at', 
        type: 'varchar', 
        length: 28, 
    })
    expiresAt: string;

    @Column({
        name: 'refreshed_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
    })
    refreshedAt: string | null;

    @Index()
    @Column({
        name: 'seen_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
    })
    seenAt: string | null;

    @Column({
        name: 'mfa_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
    })
    mfaAt: string | null;

    @Column({
        name: 'auth_method', 
        type: 'varchar', 
        length: 16, 
        nullable: true, 
    })
    authMethod: `${SessionAuthMethod}` | null;

    @Index()
    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    @Index()
    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({
        name: 'client_id', 
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

    @Index()
    @Column({
        name: 'user_id', 
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

    @Index()
    @Column({ name: 'realm_id' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
