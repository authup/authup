/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'crypto';
import {
    OAuth2AccessToken,
    OAuth2AccessTokenPayload,
    OAuth2SubKind,
    OAuth2TokenKind,
    hasOwnProperty,
} from '@authelion/common';
import { signToken } from '@authelion/server-utils';
import { OAuth2AccessTokenEntity } from '../../domains';
import { OAuth2AccessTokenBuilderContext, OAuth2AccessTokenBuilderCreateContext } from './type';
import { useDataSource } from '../../database';
import { OAuth2AccessTokenCache } from '../cache';

export class Oauth2AccessTokenBuilder {
    static MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS = 10;

    // -----------------------------------------------------

    protected context: OAuth2AccessTokenBuilderContext;

    // -----------------------------------------------------

    protected id?: OAuth2AccessToken['id'];

    // -----------------------------------------------------

    constructor(context: OAuth2AccessTokenBuilderContext) {
        this.context = context;
    }

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

    public async generateToken(
        context: Pick<OAuth2AccessTokenPayload, 'sub' | 'sub_kind' | 'remote_address' | 'client_id' | 'realm_id' >,
    ) : Promise<string> {
        const tokenPayload: Partial<OAuth2AccessTokenPayload> = {
            access_token_id: this.getId(),
            iss: this.context.selfUrl,
            sub: context.sub,
            sub_kind: context.sub_kind,
            remote_address: context.remote_address,
            kind: OAuth2TokenKind.ACCESS,
            aud: context.client_id,
            client_id: context.client_id,
            realm_id: context.realm_id,
        };

        return signToken(
            tokenPayload,
            {
                keyPair: this.context.keyPairOptions,
                expiresIn: this.context.maxAge,
            },
        );
    }

    public async create(context: OAuth2AccessTokenBuilderCreateContext) : Promise<OAuth2AccessTokenEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AccessTokenEntity);

        const entity = repository.create({
            client_id: context.clientId,
            realm_id: context.realmId,
            expires: new Date(Date.now() + (1000 * (this.context.maxAge || 3600))),
            scope: context.scope,
        });

        switch (context.subKind) {
            case OAuth2SubKind.USER: {
                entity.user_id = context.sub;
                break;
            }
            case OAuth2SubKind.ROBOT: {
                entity.robot_id = context.sub;
                break;
            }
            case OAuth2SubKind.CLIENT: {
                entity.client_id = context.sub;
                break;
            }
        }

        let maxGenerationAttempts = Oauth2AccessTokenBuilder.MAX_RANDOM_TOKEN_GENERATION_ATTEMPTS;

        while (maxGenerationAttempts-- > 0) {
            try {
                entity.id = this.getId();
                entity.content = await this.generateToken({
                    sub: context.sub,
                    sub_kind: context.subKind,
                    realm_id: context.realmId,
                    remote_address: context.remoteAddress,
                    client_id: context.clientId,
                });

                await repository.insert(entity);
                break;
            } catch (e) {
                if (
                    hasOwnProperty(e, 'code') &&
                    (
                        e.code === 'ER_DUP_ENTRY' ||
                        e.code === 'SQLITE_CONSTRAINT_UNIQUE'
                    )
                ) {
                    this.resetId();
                } else {
                    throw e;
                }
            }
        }

        const cache = new OAuth2AccessTokenCache();
        await cache.set(entity);

        return entity;
    }
}
