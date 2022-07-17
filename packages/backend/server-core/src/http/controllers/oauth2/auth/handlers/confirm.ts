/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    TokenError,
    buildHTTPQuery,
    hasOAuth2OpenIDScope,
    transformOAuth2ScopeToArray,
} from '@authelion/common';
import { randomBytes } from 'crypto';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { useDataSource } from '../../../../../database';
import { OAuth2AuthorizationCodeEntity } from '../../../../../domains';
import { runAuthorizeValidation } from '../utils';
import { useConfig } from '../../../../../config';
import { OAuth2OpenIdTokenBuilder, getOpenIDClaimsForScope } from '../../../../../oauth2';
import { buildKeyPairOptionsFromConfig } from '../../../../../utils';

export async function confirmAuthorizationRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    if (req.robotId) {
        throw TokenError.requestInvalid('Only users are permitted to use the authorize login flow.');
    }

    const result = await runAuthorizeValidation(req);

    let openIdToken : string | undefined;

    const scopes = transformOAuth2ScopeToArray(result.data.scope);
    if (hasOAuth2OpenIDScope(scopes)) {
        let claims : Record<string, any> = {};

        const config = await useConfig();

        const idTokenBuilder = new OAuth2OpenIdTokenBuilder({
            keyPairOptions: buildKeyPairOptionsFromConfig(config),
            selfUrl: config.selfUrl,
            maxAge: config.tokenMaxAgeAccessToken,
            request: req,

            realmId: req.realmId,
            userId: req.userId,
            clientId: result.data.client_id,
        });

        for (let i = 0; i < scopes.length; i++) {
            claims = {
                ...claims,
                ...getOpenIDClaimsForScope(scopes[i], req.user),
            };
        }

        // todo: append claims to id token ;)

        openIdToken = await idTokenBuilder.buildToken();
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

    const code = repository.create({
        content: randomBytes(10).toString('hex'),
        expires: new Date(Date.now() + (1000 * 300)),
        scope: result.data.scope,
        redirect_uri: result.data.redirect_uri,
        id_token: openIdToken,
        client_id: result.data.client_id,
        user_id: req.userId,
        realm_id: req.realmId,
    });

    await repository.save(code);

    return res.redirect(code.redirect_uri + buildHTTPQuery({
        code: code.content,
        ...(result.data.state ? { state: result.data.state } : {}),
    }));
}
