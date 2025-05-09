/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationData } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import { useConfig } from '../../../../../config';
import { useOAuth2AuthorizationService } from '../../../../oauth2';

export async function serveAuthorizationRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    let authorize : OAuth2AuthorizationData | undefined;
    let authorizeMessage : string | undefined;

    try {
        const authorizationService = useOAuth2AuthorizationService();
        const {
            client,
            clientScopes,

            ...codeRequest
        } = await authorizationService.validate(req);

        authorize = {
            client,
            clientScopes,
            tokenPayload: codeRequest,
            token: authorizationService.encodeCodeRequest(codeRequest),
        };
    } catch (e) {
        if (e instanceof Error) {
            authorizeMessage = e.message;
        } else {
            authorizeMessage = 'An unknown error occurred.';
        }
    }

    // 3. pass to authorize :)
    const config = useConfig();

    const url = new URL('/public', config.publicUrl);

    const content = `
    <!DOCTYPE html>
    <html lang="">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authup</title>
        <link rel="stylesheet" type="text/css" href="${url.href}/client.css" />
    </head>
    <body>
        <div id="app"></div>
        <script>
        window.baseURL = "${config.publicUrl}";
        window.authorize = ${JSON.stringify(authorize)};
        window.authorizeMessage = ${authorizeMessage ? `"${authorizeMessage}"` : 'null'};
        </script>
        <script type="module" src="${url.href}/client.js"></script>
    </body>
    </html>
    `;

    return send(res, content);
}
