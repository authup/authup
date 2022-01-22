/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import {
    OAuth2AccessToken, Oauth2Client, Oauth2RefreshToken,
} from '@typescript-auth/domains';
import { OAuth2AccessTokenEntity } from '../oauth2-access-token';
import { OAuth2ClientEntity } from '../oauth2-client';

@Entity({ name: 'auth_refresh_tokens' })
export class OAuth2RefreshTokenEntity implements Oauth2RefreshToken {
    @PrimaryGeneratedColumn('uuid')
        id: string;

    @Column({
        type: 'datetime',
    })
        expires: Date;

    @Column({
        type: 'varchar', length: 512, nullable: true, default: null,
    })
        scope: string | null;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null })
        client_id: Oauth2Client['id'] | null;

    @ManyToOne(() => OAuth2ClientEntity, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'client_id' })
        client: OAuth2ClientEntity | null;

    @Column()
        access_token_id: OAuth2AccessToken['id'];

    @ManyToOne(() => OAuth2AccessTokenEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'access_token_id' })
        access_token: OAuth2AccessTokenEntity;
}
