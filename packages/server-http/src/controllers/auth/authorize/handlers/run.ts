/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind, buildHTTPQuery,
} from '@authup/common';
import { Request, Response, sendRedirect } from 'routup';
import { useRequestEnv } from '../../../../utils/env';
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

    const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

    // ---------------------------------------------------------

    const config = useConfig();
    const codeBuilder = new OAuth2AuthorizationCodeBuilder({
        selfUrl: config.get('publicUrl'),
        maxAge: config.get('tokenMaxAgeAccessToken'),
    });

    let accessToken : string | undefined;
    if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            selfUrl: this.config.selfUrl,
            maxAge: this.config.tokenMaxAgeAccessToken,
        });

        const token = await tokenBuilder.create({
            remoteAddress: req.socket.remoteAddress,
            sub: useRequestEnv(req, 'userId'),
            subKind: OAuth2SubKind.USER,
            realmId: useRequestEnv(req, 'realmId'),
            clientId: result.data.client_id,
            scope: result.data.scope,
        });

        accessToken = token.content;
    }

    const code = await codeBuilder.create({
        sub: useRequestEnv(req, 'userId'),
        subKind: OAuth2SubKind.USER,
        remoteAddress: req.socket.remoteAddress,
        realmId: useRequestEnv(req, 'userId'),
        clientId: result.data.client_id,
        scope: result.data.scope,
        redirectUri: result.data.redirect_uri,
    });

    // ---------------------------------------------------------

    return sendRedirect(res, code.redirect_uri + buildHTTPQuery({
        ...(result.data.state ? { state: result.data.state } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.CODE] ? { code: code.content } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.TOKEN] && accessToken ? { access_token: accessToken } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] && code.id_token ? { id_token: code.id_token } : {}),
    }));
}
