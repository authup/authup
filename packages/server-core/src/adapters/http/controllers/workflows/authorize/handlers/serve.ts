/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, OAuth2AuthorizeCodeRequest, Scope,
} from '@authup/core-kit';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { Request, Response } from 'routup';
import { OAuth2AuthorizationCodeVerifier, OAuth2AuthorizeCodeRequestValidator } from '../../../../../../core';
import { sanitizeError } from '../../../../../../utils';
import { sendClientResponse } from '../../../../response';

export async function serveAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    let codeRequest : OAuth2AuthorizeCodeRequest | undefined;

    let client : Client | undefined;
    let scopes : Scope[] | undefined;

    let error : Error | undefined;

    try {
        const validator = new OAuth2AuthorizeCodeRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = validatorAdapter.run(req, {
            locations: ['body', 'query'],
        });

        const codeRequestVerifier = new OAuth2AuthorizationCodeVerifier();

        const result = await codeRequestVerifier.verify(data);
        client = result.client;
        scopes = result.clientScopes.map((s) => s.scope);

        codeRequest = result.data;
    } catch (e) {
        const normalized = sanitizeError(e);
        error = {
            ...normalized,
            message: normalized.message,
        };
    }

    return sendClientResponse(req, res, {
        path: '/authorize',
        data: {
            codeRequest,
            error,
            client,
            scopes,
        },
    });
}
