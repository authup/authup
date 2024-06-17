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
import type { IdentityProvider, IdentityProviderAccount } from '@authup/core-kit';
import { User } from '@authup/core-kit';
import { UserEntity } from '../user';
import { IdentityProviderEntity } from '../identity-provider';

@Entity({ name: 'auth_identity_provider_accounts' })
@Index(['provider_id', 'user_id'], { unique: true })
export class IdentityProviderAccountEntity implements IdentityProviderAccount {
    @PrimaryGeneratedColumn('uuid')
        id: string;

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
        expires_in: number | null;

    @Column({
        type: 'varchar', length: 28, nullable: true, default: null,
    })
        expires_at: string | null;

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // -----------------------------------------------

    @Column()
        user_id: User['id'];

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
        user: UserEntity;

    @Column()
        provider_id: IdentityProvider['id'];

    @ManyToOne(() => IdentityProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
        provider: IdentityProviderEntity;
}
