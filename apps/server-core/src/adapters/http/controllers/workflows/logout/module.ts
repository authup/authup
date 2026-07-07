/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import { URL } from 'node:url';
import type { IAppEvent } from 'routup';
import { sendRedirect } from 'routup';
import type { IOAuth2EndSessionService } from '../../../../../core/index.ts';
import { readFromLocations } from '../../../request/index.ts';
import { renderUIPage } from '../../../ui/index.ts';
import type { LogoutControllerContext, LogoutControllerOptions } from './types.ts';

@DController('/logout')
export class LogoutController {
    protected options: LogoutControllerOptions;

    protected endSessionService: IOAuth2EndSessionService;

    constructor(ctx: LogoutControllerContext) {
        this.options = ctx.options;
        this.endSessionService = ctx.endSessionService;
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string | Response> {
        return this.handle(event);
    }

    // OIDC RP-Initiated Logout allows form_post on the same endpoint.
    @DPost('', [])
    async execute(@DContext() event: IAppEvent): Promise<string | Response> {
        return this.handle(event);
    }

    protected async handle(event: IAppEvent): Promise<string | Response> {
        const merged = await readFromLocations(event, ['body', 'query']);

        const result = await this.endSessionService.verify({
            id_token_hint: merged.id_token_hint,
            client_id: merged.client_id,
            post_logout_redirect_uri: merged.post_logout_redirect_uri,
            state: merged.state,
            realm_id: merged.realm_id,
            realm_name: merged.realm_name,
        });

        // A signature-verified id_token_hint proves possession — revoke the
        // referenced session server-side immediately (only if it belongs to the
        // hint's subject). Without a hint we mutate nothing; the SSR page's
        // sign-out is a click-gated, bearer-authenticated action.
        let serverRevoked = false;
        if (result.hintVerified && result.sessionId && result.sub && result.subKind) {
            serverRevoked = await this.endSessionService.revoke(
                result.sessionId,
                result.sub,
                result.subKind,
            );
        }

        // Redirect only to a validated post_logout_redirect_uri (open-redirect
        // guard lives in the service). `state` rides only with a validated uri.
        if (result.redirectUri) {
            const url = new URL(result.redirectUri);
            if (result.state) {
                url.searchParams.set('state', result.state);
            }

            return sendRedirect(event, url.href);
        }

        const requestURL = new URL(event.request.url);

        return renderUIPage(event, {
            url: '/logout',
            payload: {
                config: { baseURL: this.options.baseURL },
                data: {
                    client: result.clientName ? { name: result.clientName } : undefined,
                    hintVerified: result.hintVerified,
                    // never reflect an unverified hint's claims
                    hintSub: result.hintVerified ? result.sub : undefined,
                    serverRevoked,
                    requestPath: `${requestURL.pathname}${requestURL.search}`,
                },
            },
        });
    }
}
