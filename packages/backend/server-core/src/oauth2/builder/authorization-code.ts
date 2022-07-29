/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenKind,
    OAuth2TokenPayload,
    hasOAuth2OpenIDScope,
    transformOAuth2ScopeToArray,
} from '@authelion/common';
import { randomBytes } from 'crypto';
import { OAuth2AuthorizationCodeBuilderContext, OAuth2AuthorizationCodeBuilderCreateContext } from './type';
import { OAuth2AuthorizationCodeEntity, signOAuth2TokenWithKey, useRealmKey } from '../../domains';
import { useDataSource } from '../../database';
import { OAuth2AuthorizationCodeCache } from '../cache';
import { getUserClaimsForScope } from '../openid';

export class OAuth2AuthorizationCodeBuilder {
    protected context: OAuth2AuthorizationCodeBuilderContext;

    // -----------------------------------------------------

    protected authTime: number;

    // -----------------------------------------------------

    constructor(context: OAuth2AuthorizationCodeBuilderContext) {
        this.context = context;
        this.authTime = new Date().getTime();
    }

    // -----------------------------------------------------

    public async generateOpenIdToken(
        context: Pick<OAuth2TokenPayload, 'remote_address' | 'sub' | 'realm_id' | 'scope' | 'client_id'> & { subEntity: Record<string, any> },
    ) : Promise<string> {
        let payload : Partial<OAuth2TokenPayload> = {};

        if (payload.scope) {
            const scopes = transformOAuth2ScopeToArray(context.scope);
            for (let i = 0; i < scopes.length; i++) {
                payload = {
                    ...payload,
                    ...getUserClaimsForScope(scopes[i], payload.user),
                };
            }
        }

        const tokenPayload: Partial<OAuth2TokenPayload> = {
            iss: this.context.selfUrl,
            sub: context.sub,
            remote_address: context.remote_address,
            kind: OAuth2TokenKind.ID_TOKEN,
            aud: context.client_id,
            client_id: context.client_id,
            realm_id: context.realm_id,
            auth_time: this.authTime,
        };

        const key = await useRealmKey(context.realm_id);
        return signOAuth2TokenWithKey(
            tokenPayload,
            key,
            {
                keyid: key.id,
                expiresIn: this.context.maxAge,
            },
        );
    }

    // -----------------------------------------------------

    public async create(
        context: OAuth2AuthorizationCodeBuilderCreateContext,
    ) : Promise<OAuth2AuthorizationCodeEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

        const entity = repository.create({
            content: randomBytes(10).toString('hex'),
            expires: new Date(Date.now() + (1000 * 300)),
            redirect_uri: context.redirectUri,
            client_id: context.clientId,
            user_id: context.sub,
            realm_id: context.realmId,
        });

        if (hasOAuth2OpenIDScope(entity.scope)) {
            entity.id_token = await this.generateOpenIdToken({
                sub: context.sub,
                realm_id: context.realmId,
                remote_address: context.remoteAddress,
                client_id: context.clientId,
                subEntity: context.subEntity,
            });
        }

        await repository.insert(entity);

        const cache = new OAuth2AuthorizationCodeCache();
        await cache.set(entity);

        return entity;
    }
}
