/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind,
    hasOAuth2OpenIDScope,
} from '@authup/common';
import { OAuth2AuthorizationCodeEntity, signOAuth2TokenWithKey, useKey } from '@authup/server-database';
import { randomBytes } from 'node:crypto';
import { Request, getRequestIp } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../utils';
import {
    OAuth2AccessTokenBuildContext,
    OAuth2OpenIdTokenBuildContext,
    buildOAuth2AccessTokenPayload,
    buildOpenIdTokenPayload, extendOpenIdTokenPayload,
} from '../token/builder';
import { OAuth2AuthorizationCodeCache } from '../cache';
import { getOauth2AuthorizeResponseTypesByRequest } from '../response';
import { AuthorizeRequestOptions, AuthorizeRequestResult } from './type';
import { validateAuthorizeRequest } from './validation';

export async function authorizeRequest(
    req: Request,
    options: AuthorizeRequestOptions,
) : Promise<AuthorizeRequestResult> {
    const accessTokenMaxAge = options.accessTokenMaxAge || 7200;
    const authorizationCodeMaxAge = options.authorizationCodeMaxAge || 300;
    const idTokenMaxAge = options.idTokenMaxAge || 7200;

    const result = await validateAuthorizeRequest(req);

    const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

    const output : AuthorizeRequestResult = {
        redirectUri: result.data.redirect_uri,
        ...(result.data.state ? { state: result.data.state } : {}),
    };

    const { id: realmId, name: realmName } = useRequestEnv(req, 'realm');

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

    const entity = repository.create({
        content: randomBytes(10).toString('hex'),
        expires: new Date(Date.now() + (1000 * authorizationCodeMaxAge)).toISOString(),
        redirect_uri: result.data.redirect_uri,
        client_id: result.data.client_id,
        user_id: useRequestEnv(req, 'userId'),
        realm_id: realmId,
        scope: result.data.scope,
    });

    const key = await useKey({ realm_id: realmId });

    const tokenBuildContext : OAuth2AccessTokenBuildContext | OAuth2OpenIdTokenBuildContext = {
        issuer: options.issuer,
        remoteAddress: getRequestIp(req, { trustProxy: true }),
        sub: useRequestEnv(req, 'userId'),
        subKind: OAuth2SubKind.USER,
        realmId,
        realmName,
        clientId: result.data.client_id,
        ...(result.data.scope ? { scope: result.data.scope } : {}),
    };

    if (
        responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
        hasOAuth2OpenIDScope(entity.scope)
    ) {
        entity.id_token = await signOAuth2TokenWithKey(
            await extendOpenIdTokenPayload(buildOpenIdTokenPayload(tokenBuildContext)),
            key,
            {
                keyid: key.id,
                expiresIn: idTokenMaxAge,
            },
        );

        if (responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
            output.idToken = entity.id_token;
        }
    }

    if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
        output.accessToken = await signOAuth2TokenWithKey(
            await buildOAuth2AccessTokenPayload(tokenBuildContext),
            key,
            {
                keyid: key.id,
                expiresIn: accessTokenMaxAge,
            },
        );
    }

    await repository.save(entity);

    const cache = new OAuth2AuthorizationCodeCache();
    await cache.set(entity);

    if (responseTypes[OAuth2AuthorizationResponseType.CODE]) {
        output.authorizationCode = entity.content;
    }

    return output;
}
