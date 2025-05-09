/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { URL } from 'node:url';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useOAuth2AuthorizationService } from '../../../../oauth2';

export async function runAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const authorizationService = useOAuth2AuthorizationService();
    const result = await authorizationService.executeWithRequest(req);

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

    return send(res, { url: url.href });
}
