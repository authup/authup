/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomBytes } from 'node:crypto';
import type { OAuth2SubKind } from '@authup/kit';
import {
    OAuth2AuthorizationResponseType,
} from '@authup/kit';
import {
    hasOAuth2OpenIDScope,
} from '@authup/core-kit';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { OAuth2AuthorizationCodeEntity } from '../../../domains';
import { useRequestIdentityOrFail } from '../../request';
import type {
    OAuth2AccessTokenBuildContext,
    OAuth2OpenIdTokenBuildContext,
} from '../token';
import {
    OAuth2TokenManager,
    buildOAuth2AccessTokenPayload,
    buildOpenIdTokenPayload,
    extendOpenIdTokenPayload,
} from '../token';
import { getOauth2AuthorizeResponseTypesByRequest } from '../response';
import type { AuthorizeRequestOptions, AuthorizeRequestResult } from './type';
import { validateAuthorizeRequest } from './validation';

export async function runOAuth2Authorization(
    req: Request,
    options: AuthorizeRequestOptions,
) : Promise<AuthorizeRequestResult> {
    const accessTokenMaxAge = options.accessTokenMaxAge || 7200;
    const authorizationCodeMaxAge = options.authorizationCodeMaxAge || 300;
    const idTokenMaxAge = options.idTokenMaxAge || 7200;

    const data = await validateAuthorizeRequest(req);

    const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

    const output : AuthorizeRequestResult = {
        redirectUri: data.redirect_uri,
        ...(data.state ? { state: data.state } : {}),
    };

    const identity = useRequestIdentityOrFail(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

    const entity = repository.create({
        content: randomBytes(10).toString('hex'),
        expires: new Date(Date.now() + (1000 * authorizationCodeMaxAge)).toISOString(),
        redirect_uri: data.redirect_uri,
        client_id: data.client_id,
        realm_id: identity.realmId,
        scope: data.scope,
    });

    if (identity.type === 'user') {
        entity.user_id = identity.id;
    }

    if (identity.type === 'robot') {
        entity.robot_id = identity.id;
    }

    const tokenManager = new OAuth2TokenManager();
    const tokenBuildContext : OAuth2AccessTokenBuildContext | OAuth2OpenIdTokenBuildContext = {
        issuer: options.issuer,
        remoteAddress: getRequestIP(req, { trustProxy: true }),
        sub: identity.id,
        subKind: identity.type as `${OAuth2SubKind}`,
        realmId: identity.realmId,
        realmName: identity.realmName,
        clientId: data.client_id,
        ...(data.scope ? { scope: data.scope } : {}),
    };

    if (
        responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] ||
        hasOAuth2OpenIDScope(entity.scope)
    ) {
        tokenBuildContext.maxAge = idTokenMaxAge;

        const signingResult = await tokenManager.sign(
            await extendOpenIdTokenPayload(buildOpenIdTokenPayload(tokenBuildContext)),
        );
        entity.id_token = signingResult.token;

        if (responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN]) {
            output.idToken = entity.id_token;
        }
    }

    if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
        tokenBuildContext.maxAge = accessTokenMaxAge;

        const signingResult = await tokenManager.sign(
            buildOAuth2AccessTokenPayload(tokenBuildContext),
        );

        output.accessToken = signingResult.token;
    }

    await repository.save(entity);

    if (responseTypes[OAuth2AuthorizationResponseType.CODE]) {
        output.authorizationCode = entity.content;
    }

    return output;
}
