/*
 * Copyright (c) 2026.
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
    VersionColumn,
} from 'typeorm';
import type {
    Realm,
    User,
    UserAuthenticator,
    UserAuthenticatorKind,
} from '@authup/core-kit';
import { dateToISOStringTransformer } from '../../helpers/index.ts';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';

@Entity({ name: 'auth_user_authenticators' })
export class UserAuthenticatorEntity implements UserAuthenticator {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 16,
    })
    kind: `${UserAuthenticatorKind}`;

    @Column({
        type: 'varchar',
        length: 128,
        nullable: true,
        default: null,
    })
    name: string | null;

    // select:false — a stray read must never surface the encrypted seed
    // (defense in depth on top of the read-DTO stripping in the service).
    @Column({
        type: 'text',
        nullable: true,
        select: false,
    })
    secret: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    parameters: string | null;

    @Column({
        type: 'text',
        nullable: true,
        select: false,
    })
    codes: string | null;

    @Column({
        type: 'boolean',
        default: false,
    })
    confirmed: boolean;

    // Optimistic-concurrency guard: a concurrent verify that mutates the row
    // (recovery-code consumption, TOTP step advance) fails the second save with
    // a version mismatch, so a factor is consumed exactly once (plan-049
    // hardening, #3237).
    @VersionColumn()
    version: number;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    last_used_at: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    created_at: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updated_at: string;

    // ------------------------------------------------------------------

    @Index()
    @Column({ type: 'uuid' })
    user_id: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ type: 'uuid' })
    realm_id: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
    realm: RealmEntity;
}
