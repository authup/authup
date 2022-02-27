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
import { OAuth2Provider, OAuth2ProviderAccount, User } from '@typescript-auth/domains';
import { UserEntity } from '../user';
import { OAuth2ProviderEntity } from '../oauth2-provider';

@Entity({ name: 'auth_oauth2_provider_accounts' })
@Index(['provider_id', 'user_id'], { unique: true })
export class OAuth2ProviderAccountEntity implements OAuth2ProviderAccount {
    @PrimaryGeneratedColumn()
        id: number;

    @Column({ type: 'text', nullable: true, default: null })
        access_token: string;

    @Column({ type: 'text', nullable: true, default: null })
        refresh_token: string;

    @Column({ type: 'varchar', length: 256 })
        provider_user_id: string;

    @Column({
        type: 'varchar', length: 256, nullable: true, default: null,
    })
        provider_user_name: string;

    @Column({
        type: 'varchar', length: 512, nullable: true, default: null,
    })
        provider_user_email: string;

    @Column({
        type: 'int', unsigned: true, nullable: true, default: null,
    })
        expires_in: number;

    @Column({ type: 'datetime', nullable: true, default: null })
        expires_at: Date;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // -----------------------------------------------

    @Column()
        user_id: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: User;

    @Column()
        provider_id: string;

    @ManyToOne(() => OAuth2ProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
        provider: OAuth2Provider;
}
