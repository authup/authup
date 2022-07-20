/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationResponseType,
    OAuth2SubKind, TokenError, buildHTTPQuery,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { runAuthorizeValidation } from '../utils';
import { useConfig } from '../../../../../config';
import {
    OAuth2AuthorizationCodeBuilder,
    Oauth2AccessTokenBuilder,
    getOauth2AuthorizeResponseTypesByRequest,
} from '../../../../../oauth2';
import { buildKeyPairOptionsFromConfig } from '../../../../../utils';

export async function runAuthorizationRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    if (!req.userId) {
        throw TokenError.requestInvalid('Only users are permitted to use the authorization code flow.');
    }

    const result = await runAuthorizeValidation(req);

    const responseTypes = getOauth2AuthorizeResponseTypesByRequest(req);

    // ---------------------------------------------------------

    const config = await useConfig();
    const codeBuilder = new OAuth2AuthorizationCodeBuilder({
        keyPairOptions: buildKeyPairOptionsFromConfig(config),
        selfUrl: config.selfUrl,
        maxAge: config.tokenMaxAgeAccessToken,
    });

    let accessToken : string | undefined;
    if (responseTypes[OAuth2AuthorizationResponseType.TOKEN]) {
        const tokenBuilder = new Oauth2AccessTokenBuilder({
            keyPairOptions: {
                directory: this.config.writableDirectoryPath,
            },
            selfUrl: this.config.selfUrl,
            maxAge: this.config.tokenMaxAgeAccessToken,
        });

        const token = await tokenBuilder.create({
            remoteAddress: req.ip,
            sub: req.userId,
            subKind: OAuth2SubKind.USER,
            realmId: req.realmId,
            clientId: result.data.client_id,
            scope: result.data.scope,
        });

        accessToken = token.content;
    }

    const code = await codeBuilder.create({
        sub: req.userId,
        subKind: OAuth2SubKind.USER,
        subEntity: req.user,
        remoteAddress: req.ip,
        realmId: req.realmId,
        clientId: result.data.client_id,
        scope: result.data.scope,
        redirectUri: result.data.redirect_uri,
    });

    // ---------------------------------------------------------

    return res.redirect(code.redirect_uri + buildHTTPQuery({
        ...(result.data.state ? { state: result.data.state } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.CODE] ? { code: code.content } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.TOKEN] && accessToken ? { access_token: accessToken } : {}),
        ...(responseTypes[OAuth2AuthorizationResponseType.ID_TOKEN] && code.id_token ? { id_token: code.id_token } : {}),
    }));
}
