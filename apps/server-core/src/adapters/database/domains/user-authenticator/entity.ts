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

    @Index('IDX_auth_user_authenticators_kind')
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

    @Column({
        name: 'last_used_at', 
        type: 'varchar', 
        length: 28, 
        nullable: true, 
        default: null, 
    })
    lastUsedAt: string | null;

    // ------------------------------------------------------------------

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // ------------------------------------------------------------------

    @Index('IDX_auth_user_authenticators_user_id')
    @Column({ name: 'user_id', type: 'uuid' })
    userId: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'user_id',
        foreignKeyConstraintName: 'FK_auth_user_authenticators_user_id',
    })
    user: UserEntity;

    @Column({ name: 'realm_id', type: 'uuid' })
    realmId: Realm['id'];

    @ManyToOne(() => RealmEntity, { onDelete: 'CASCADE' })
    @JoinColumn({
        name: 'realm_id',
        foreignKeyConstraintName: 'FK_auth_user_authenticators_realm_id',
    })
    realm: RealmEntity;
}
