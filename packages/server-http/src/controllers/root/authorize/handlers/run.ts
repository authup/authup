/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind,
} from '@authup/common';
import { signOAuth2TokenWithKey, useKey } from '@authup/server-database';
import {
    Request, Response, getRequestIp, send,
} from 'routup';
import { URL } from 'node:url';
import { useRequestEnv } from '../../../../utils';
import { runAuthorizeValidation } from '../utils';
import { useConfig } from '../../../../config';
import {
    OAuth2AuthorizationCodeBuilder,
    Oauth2AccessTokenBuilder,
    getOauth2AuthorizeResponseTypesByRequest,
} from '../../../../oauth2';

export async function runAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const result = await runAuthorizeValidation(req);

    const config = useConfig();

    const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

    // ---------------------------------------------------------

    const codeBuilder = new OAuth2AuthorizationCodeBuilder({
        selfUrl: config.get('publicUrl'),
        maxAge: config.get('tokenMaxAgeAccessToken'),
    });

    let accessToken : string | undefined;
    if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            selfUrl: config.get('publicUrl'),
            maxAge: config.get('tokenMaxAgeAccessToken'),
        });

        const { id: realmId, name: realmName } = useRequestEnv(req, 'realm');

        const token = await tokenBuilder.create({
            remoteAddress: getRequestIp(req, { trustProxy: true }),
            sub: useRequestEnv(req, 'userId'),
            subKind: OAuth2SubKind.USER,
            realmId,
            realmName,
            clientId: result.data.client_id,
            scope: result.data.scope,
        });

        const key = await useKey({ realm_id: realmId });
        accessToken = await signOAuth2TokenWithKey(
            token,
            key,
            {
                keyid: key.id,
                expiresIn: config.get('tokenMaxAgeAccessToken'),
            },
        );
    }

    const { id: realmId } = useRequestEnv(req, 'realm');

    const code = await codeBuilder.create({
        idToken: responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN],

        sub: useRequestEnv(req, 'userId'),
        subKind: OAuth2SubKind.USER,
        remoteAddress: getRequestIp(req, { trustProxy: true }),
        realmId,
        clientId: result.data.client_id,
        scope: result.data.scope,
        redirectUri: result.data.redirect_uri,
    });

    // ---------------------------------------------------------

    const url = new URL(code.redirect_uri);
    if (result.data.state) {
        url.searchParams.set('state', result.data.state);
    }

    if (responseTypes[OAuth2AuthorizationResponseType.CODE]) {
        url.searchParams.set('code', code.content);
    }

    if (
        responseTypes[OAuth2AuthorizationResponseType.TOKEN] &&
        accessToken
    ) {
        url.searchParams.set('access_token', accessToken);
    }

    if (
        responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] &&
        code.id_token
    ) {
        url.searchParams.set('id_token', code.id_token);
    }

    send(res, {
        url: url.href,
    });
}
