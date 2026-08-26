/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EndSessionResponse } from '@authup/core-http-kit';
import {
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import { URL } from 'node:url';
import type { IAppEvent } from 'routup';
import { getRequestHeader } from 'routup';
import type { IOAuth2EndSessionService, OAuth2EndSessionRequest } from '../../../../../core/index.ts';
import { OAuth2EndSessionRequestValidator } from '../../../../../core/index.ts';
import { readFromLocations } from '../../../request/index.ts';
import { redirectToAuthConsole } from '../auth-console.ts';
import type { LogoutControllerContext, LogoutControllerOptions } from './types.ts';

@DController('/logout')
export class LogoutController {
    protected options: LogoutControllerOptions;

    protected endSessionService: IOAuth2EndSessionService;

    protected validator: OAuth2EndSessionRequestValidator;

    constructor(ctx: LogoutControllerContext) {
        this.options = ctx.options;
        this.endSessionService = ctx.endSessionService;
        this.validator = new OAuth2EndSessionRequestValidator();
    }

    /**
     * `end_session_endpoint` keeps both of its OIDC bindings, and both are
     * BROWSER NAVIGATIONS: the RP either redirects the user here (GET) or
     * auto-submits a form at it (form_post). Neither can consume a JSON
     * answer, so both hand over to the console service, carrying the
     * request's own parameters.
     *
     * The revoke moved to the JSON call the rendered page makes (plan 101
     * D2). It could not stay here: the page needs `serverRevoked`,
     * `hintSub` and `hintSubKind` to decide whether to tear its own local
     * session down, and those must reach it as the answer to its OWN
     * request. Putting them in the redirect URL would let anyone craft
     * them, which is exactly the forced-logout CSRF the client-side gate
     * exists to refuse.
     *
     * The consequence to know: a browser with JavaScript disabled no
     * longer revokes. It also never returns to the RP, so both sides stay
     * consistent rather than the RP believing a logout it did not get.
     */
    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<Response> {
        return this.forward(event);
    }

    @DPost('', [])
    async execute(@DContext() event: IAppEvent): Promise<Response | EndSessionResponse> {
        // A JSON body is the console page asking us to end the session; a
        // form body is the OIDC form_post binding, i.e. a navigation. A
        // browser cannot navigate with a JSON body, so the two never blur.
        if (this.isJSONRequest(event)) {
            return this.endSession(event);
        }

        return this.forward(event);
    }

    protected isJSONRequest(event: IAppEvent) : boolean {
        const contentType = getRequestHeader(event, 'content-type');

        return typeof contentType === 'string' && contentType.includes('application/json');
    }

    protected async forward(event: IAppEvent): Promise<Response> {
        // Both bindings merge body and query, so the form_post parameters
        // survive the hop (a 302 turns the POST into a GET).
        const merged = await readFromLocations(event, ['body', 'query']);

        return redirectToAuthConsole(event, this.options.authConsoleUrl, '/logout', merged);
    }

    /**
     * The end-session work itself, unchanged from when it ran on the page
     * GET: validate, verify the hint, revoke the session it references, and
     * validate the post-logout redirect. Only the reply is different, and
     * only because the caller is now the page rather than the browser's
     * address bar.
     */
    protected async endSession(event: IAppEvent): Promise<EndSessionResponse> {
        const merged = await readFromLocations(event, ['body', 'query']);

        // Malformed input (oversized / duplicated params) must never dead-end
        // the human behind the browser on a JSON error, nor discard a valid
        // id_token_hint: a bad *cosmetic* param (post_logout_redirect_uri /
        // state / client_id / realm hint) must NOT cancel the
        // security-critical revoke the hint authorizes. So on a full-request
        // validation failure, retry with the hint ALONE — the revoke needs
        // nothing else: its subject/session come from the verified hint's
        // claims, and client resolution degrades gracefully (the service
        // falls back to the hint's sole `aud`, scoped by the hint's own realm
        // claim — the dropped request params only affected the confirm page's
        // client name and the redirect, which is dropped anyway). Only a
        // malformed hint itself falls through to the parameter-less answer.
        let data: OAuth2EndSessionRequest;
        try {
            data = await this.validator.run(merged);
        } catch {
            try {
                data = await this.validator.run({ id_token_hint: merged.id_token_hint });
            } catch {
                data = {};
            }
        }

        const result = await this.endSessionService.verify(data);

        // A signature-verified id_token_hint proves possession — revoke the
        // referenced session server-side immediately (only if it belongs to the
        // hint's subject). Without a hint we mutate nothing; the page's
        // sign-out is a click-gated, bearer-authenticated action.
        let serverRevoked = false;
        if (result.hintVerified && result.sessionId && result.sub && result.subKind) {
            serverRevoked = await this.endSessionService.revoke(
                result.sessionId,
                result.sub,
                result.subKind,
            );
        }

        // Build the validated post-logout redirect (the open-redirect guard
        // lives in the service; `state` rides only alongside a validated uri).
        let redirect: string | undefined;
        if (result.redirectUri) {
            const url = new URL(result.redirectUri);
            if (result.state) {
                url.searchParams.set('state', result.state);
            }

            redirect = url.href;
        }

        // `redirect` rides along whether or not the session was revoked
        // here, because the page navigates it only AFTER its own sign-out
        // has run. That is the same rule as before: what was gated on
        // `serverRevoked` was the server's automatic 302, so that a
        // hint-less round-trip could not make an RP believe a logout it
        // never got. A hint-less request still reaches the RP, but only
        // once a human has clicked and the local session is actually gone.
        event.response.headers.set('cache-control', 'no-store');

        return {
            clientName: result.clientName,
            hintVerified: result.hintVerified,
            // never reflect an unverified hint's claims: they are the
            // operands of the page's own auto-clear gate
            hintSub: result.hintVerified ? result.sub : undefined,
            hintSubKind: result.hintVerified ? result.subKind : undefined,
            serverRevoked,
            redirect,
        };
    }
}
