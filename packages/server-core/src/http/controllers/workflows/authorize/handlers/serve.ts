/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sanitizeError } from '../../../../../utils';
import { useOAuth2AuthorizationService } from '../../../../oauth2';
import { sendClientResponse } from '../../../../response/client';

export async function serveAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

    let client : Client | undefined;
    let scopes : Scope[] | undefined;

    let error : Error | undefined;

    try {
        const authorizationService = useOAuth2AuthorizationService();
        const result = await authorizationService.validateWithRequest(req);

        client = result.client;
        scopes = result.clientScopes.map((s) => s.scope);

        codeRequest = result.data;
    } catch (e) {
        error = sanitizeError(e);
    }

    return sendClientResponse(req, res, {
        data: {
            codeRequest,
            error: {
                ...error,
                message: error.message,
            },
            client,
            scopes,
        },
    });
}
