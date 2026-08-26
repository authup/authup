/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { sendRedirect } from 'routup';

/**
 * Hand a hosted page over to the auth console service (plan 101 D2).
 *
 * server-core keeps the protocol: the endpoints, the issuer, every POST
 * that mints or ends something. What moves is where the page RENDERS, so
 * these GETs become a stateless hop, with the request's own parameters
 * re-carried, and nothing decided here.
 *
 * Stateless is the point. There is no server-side handle for the pending
 * request: the request is the application's own public URL, a cookie
 * handle would clobber across tabs, and a TTL would break the mail-borne
 * `redirect=` chain that arrives days later.
 */
export function redirectToAuthConsole(
    event: IAppEvent,
    authConsoleUrl: string,
    page: string,
    params?: Record<string, any>,
) : Response {
    const target = new URL(`${authConsoleUrl.replace(/\/+$/, '')}${page}`);

    const source = params ?? useRequestQuery(event);
    for (const [key, value] of Object.entries(source)) {
        const values = Array.isArray(value) ? value : [value];
        for (const item of values) {
            if (typeof item !== 'undefined' && item !== null) {
                target.searchParams.append(key, `${item}`);
            }
        }
    }

    // The hop reflects the request's own parameters, which routinely carry
    // an id_token_hint, a token or a redirect. Never let one be cached.
    event.response.headers.set('cache-control', 'no-store');

    return sendRedirect(event, target.href);
}
