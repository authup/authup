/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useConfig } from '../../../../../config';
import { runOAuth2Authorization } from '../../../../oauth2';

export async function runAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const config = useConfig();
    const result = await runOAuth2Authorization(req, {
        issuer: config.get('publicUrl'),
        accessTokenMaxAge: config.get('tokenMaxAgeAccessToken'),
    });

    // ---------------------------------------------------------

    const url = new URL(result.redirectUri);
    if (result.state) {
        url.searchParams.set('state', result.state);
    }

    if (result.authorizationCode) {
        url.searchParams.set('code', result.authorizationCode);
    }

    if (result.accessToken) {
        url.searchParams.set('access_token', result.accessToken);
    }

    if (result.idToken) {
        url.searchParams.set('id_token', result.idToken);
    }

    send(res, { url: url.href });
}
