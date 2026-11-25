/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';

/**
 * How long before its expiry an access token counts as expired, so a render
 * never starts on a token that dies while its requests are in flight.
 */
export const RENDER_DEFER_SKEW_MS = 30_000;

function parseExpireDate(value: string) : number {
    let input = value;

    // `useCookie` stores a Date as its JSON form, quotes included.
    if (input.startsWith('"')) {
        try {
            input = JSON.parse(input);
        } catch {
            return NaN;
        }
    }

    return new Date(input).getTime();
}

/**
 * Whether only a token refresh could serve this request's session. A server
 * render never refreshes (#3925), so such a request renders client-only and
 * the browser refreshes under its cross-tab lock before the route guards run.
 */
export function shouldDeferRender(
    read: (name: string) => string | undefined,
    now: number = Date.now(),
) : boolean {
    if (!read(CookieName.REFRESH_TOKEN)) {
        return false;
    }

    if (!read(CookieName.ACCESS_TOKEN)) {
        return true;
    }

    const expireDate = read(CookieName.ACCESS_TOKEN_EXPIRE_DATE);

    if (!expireDate) {
        return false;
    }

    const expireTime = parseExpireDate(expireDate);

    if (Number.isNaN(expireTime)) {
        return false;
    }

    return expireTime - now < RENDER_DEFER_SKEW_MS;
}
