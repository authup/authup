/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2RefreshToken, hasOwnProperty } from '@typescript-auth/domains';
import { getRepository } from 'typeorm';
import { randomUUID } from 'crypto';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { RefreshTokenBuilderContext } from './type';

export class Oauth2RefreshTokenBuilder {
    static MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS = 10;

    // -----------------------------------------------------

    protected context : RefreshTokenBuilderContext;

    // -----------------------------------------------------

    protected entity?: OAuth2RefreshTokenEntity;

    // -----------------------------------------------------

    protected id?: OAuth2RefreshToken['id'];

    protected expires?: Date;

    // -----------------------------------------------------

    getId() {
        if (!this.id) {
            this.id = randomUUID();
        }

        return this.id;
    }

    resetId() {
        this.id = undefined;
    }

    // -----------------------------------------------------

    constructor(context: RefreshTokenBuilderContext) {
        this.context = context;
    }

    async create(data?: Partial<OAuth2RefreshTokenEntity>) : Promise<OAuth2RefreshTokenEntity> {
        const repository = getRepository(OAuth2RefreshTokenEntity);

        let entity = repository.create({
            client_id: this.context.accessToken.client_id,
            expires: this.getExpireDate(),
            scope: this.context.accessToken.scope,
            access_token_id: this.context.accessToken.id,
            realm_id: this.context.accessToken.realm_id,
        });

        entity = repository.merge(entity, {
            ...(data || {}),
        });

        let maxGenerationAttempts = Oauth2RefreshTokenBuilder.MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS;

        while (maxGenerationAttempts-- > 0) {
            try {
                entity.id = this.getId();
                await repository.insert(entity);
                break;
            } catch (e) {
                if (
                    hasOwnProperty(e, 'code') &&
                    e.code === 'ER_DUP_ENTRY'
                ) {
                    this.resetId();
                } else {
                    throw e;
                }
            }
        }

        this.entity = entity;

        return entity;
    }

    setExpireDate(time: Date) {
        this.expires = time;

        return this;
    }

    getExpireDate() : Date {
        return this.expires || new Date(Date.now() + (1000 * (this.context.maxAge | 3600)));
    }
}
