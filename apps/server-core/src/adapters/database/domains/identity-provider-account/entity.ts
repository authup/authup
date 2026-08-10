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
 
    IdentityProvider, 
    IdentityProviderAccount, 
    Realm, 
    User,  
} from '@authup/core-kit';
import { RealmEntity } from '../realm/index.ts';
import { UserEntity } from '../user/index.ts';
import { IdentityProviderEntity } from '../identity-provider/index.ts';

@Entity({ name: 'auth_identity_provider_accounts' })
@Index(['providerId', 'userId'], { unique: true })
export class IdentityProviderAccountEntity implements IdentityProviderAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        name: 'access_token',
        type: 'text',
        nullable: true,
        default: null,
        select: false,
    })
    accessToken: string;

    @Column({
        name: 'refresh_token',
        type: 'text',
        nullable: true,
        default: null,
        select: false,
    })
    refreshToken: string;

    @Column({
        name: 'provider_user_id', 
        type: 'varchar', 
        length: 256, 
    })
    providerUserId: string;

    @Column({
        name: 'provider_user_name', 
        type: 'varchar', 
        length: 256, 
        nullable: true, 
        default: null, 
    })
    providerUserName: string;

    @Column({
        name: 'provider_user_email', 
        type: 'varchar', 
        length: 512, 
        nullable: true, 
        default: null, 
    })
    providerUserEmail: string;

    @Column({
        name: 'expires_in',
        type: 'int',
        unsigned: true,
        nullable: true,
        default: null,
        select: false,
    })
    expiresIn: number | null;

    @Column({
        name: 'expires_at',
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
        select: false,
    })
    expiresAt: string | null;

    @CreateDateColumn({ name: 'created_at', transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ name: 'updated_at', transformer: dateToISOStringTransformer })
    updatedAt: string;

    // -----------------------------------------------

    @Column({ name: 'user_id' })
    userId: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'user_realm_id', nullable: true })
    userRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_realm_id' })
    userRealm: RealmEntity | null;

    // -----------------------------------------------

    @Column({ name: 'provider_id' })
    providerId: IdentityProvider['id'];

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: IdentityProviderEntity;

    @Column({ name: 'provider_realm_id', nullable: true })
    providerRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'provider_realm_id' })
    providerRealm: RealmEntity | null;
}
