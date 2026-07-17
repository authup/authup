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
        type: 'text',
        nullable: true,
        default: null, 
    })
    accessToken: string;

    @Column({
        type: 'text',
        nullable: true,
        default: null, 
    })
    refreshToken: string;

    @Column({
        type: 'varchar',
        length: 256, 
    })
    providerUserId: string;

    @Column({
        type: 'varchar',
        length: 256,
        nullable: true,
        default: null,
    })
    providerUserName: string;

    @Column({
        type: 'varchar',
        length: 512,
        nullable: true,
        default: null,
    })
    providerUserEmail: string;

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
        default: null,
    })
    expiresIn: number | null;

    @Column({
        type: 'varchar',
        length: 28,
        nullable: true,
        default: null,
    })
    expiresAt: string | null;

    @CreateDateColumn({ transformer: dateToISOStringTransformer })
    createdAt: string;

    @UpdateDateColumn({ transformer: dateToISOStringTransformer })
    updatedAt: string;

    // -----------------------------------------------

    @Column()
    userId: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ nullable: true })
    userRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'user_realm_id' })
    userRealm: RealmEntity | null;

    // -----------------------------------------------

    @Column()
    providerId: IdentityProvider['id'];

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: IdentityProviderEntity;

    @Column({ nullable: true })
    providerRealmId: Realm['id'] | null;

    @ManyToOne(() => RealmEntity, {
        onDelete: 'CASCADE',
        nullable: true, 
    })
    @JoinColumn({ name: 'provider_realm_id' })
    providerRealm: RealmEntity | null;
}
