/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type { IAppEvent } from 'routup';

export type SameOriginRequestOptions = {
    /**
     * Reports an origin mismatch ONCE per process (see below). Omitted, the
     * predicate is silent.
     */
    logger?: Logger,
};

/**
 * Methods RFC 9110 §9.2.1 defines as safe. A browser omits `Origin` on a
 * same-origin request only for these; `fetch` / XHR set it on every other
 * method, so an absent header on a state-changing request is not a browser
 * doing what browsers do.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether a request demonstrably originates from publicUrl's own origin. This
 * is the gate every cookie-authenticated surface rides on (plan 088), where
 * the credential is ambient and no header proves intent by itself.
 *
 * Three conditions, in order:
 *
 * 1. `Sec-Fetch-Site: same-origin`, **failing closed when the header is
 *    absent**. This is the condition `SameSite` cannot carry: the attribute is
 *    scoped to the registrable domain, so a hostile sibling subdomain is
 *    *same-site* and its requests carry the cookie. A sibling sends
 *    `same-site`, never `same-origin`. Fetch Metadata is universal across the
 *    consoles' browser baseline (Chrome 111+, Safari 16.4+, Firefox 128+), so
 *    an absent header means a non-browser client, which has no business
 *    presenting a browser credential.
 * 2. When `Origin` is present it must equal publicUrl's own origin.
 * 3. When it is absent, only a safe method passes.
 *
 * A predicate rather than an assertion: the authorization middleware ignores a
 * cookie that fails this and continues anonymous, while a route that acts on
 * the cookie rejects.
 *
 * The mismatch in (2) is logged once, naming both values, because it is a
 * deployment fault rather than an attack in every case that actually happens:
 * a browser-facing host differing from `publicUrl` otherwise presents as a
 * console that loads and then silently 401s every write.
 */
export function isSameOriginRequest(
    event: IAppEvent,
    baseURL: string,
    options: SameOriginRequestOptions = {},
) : boolean {
    if (event.headers.get('sec-fetch-site') !== 'same-origin') {
        return false;
    }

    let expected : string;
    try {
        expected = new URL(baseURL).origin;
    } catch {
        return false;
    }

    const origin = event.headers.get('origin');
    if (origin) {
        if (origin !== expected) {
            reportOriginMismatch(origin, expected, options.logger);
            return false;
        }

        return true;
    }

    return SAFE_METHODS.has(`${event.method}`.toUpperCase());
}

let originMismatchReported = false;

function reportOriginMismatch(
    origin: string,
    expected: string,
    logger?: Logger,
) : void {
    if (originMismatchReported || !logger) {
        return;
    }

    originMismatchReported = true;

    logger.warn(
        `A same-origin request carried the origin ${origin}, but publicUrl resolves to ${expected}. ` +
        'Cookie-authenticated requests from that origin are refused. ' +
        'Set publicUrl to the origin the browser actually reaches.',
    );
}
