/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import { setResponseCookie, unsetResponseCookie } from '@routup/basic/cookie';
import type { IAppEvent } from 'routup';
import { CONSOLE_SESSION_COOKIE } from '../../../core/index.ts';

/**
 * The console session cookie's flags live here, in ONE place, because every
 * one of them is load-bearing and two copies would drift:
 *
 * - `httpOnly` is the whole point of plan 088 (a token in JavaScript is what
 *   this replaces);
 * - `sameSite: 'strict'` is the first of the three conditions the gate rests
 *   on, so the credential never rides a cross-site request;
 * - `path` is the deployment's base path, never a hard-coded `/`, which under
 *   a sub-path deployment would hand the cookie to every app co-hosted on the
 *   host.
 *
 * Both writers go through here: the callback that mints the credential, and
 * the authorization middleware, which re-arms the expiry (see below).
 */
export function buildConsoleSessionCookiePath(baseURL: string) : string {
    return getURLBasePath(baseURL) || '/';
}

function isSecureBaseURL(baseURL: string) : boolean {
    try {
        return new URL(baseURL).protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Write the console session cookie.
 *
 * `ttl` is the session's REMAINING lifetime in milliseconds; `Max-Age` is
 * seconds, so it is divided. Taken literally the millisecond value would emit
 * a cookie outliving its session by three orders of magnitude.
 *
 * This is called on every slide, not only at login. The session's `expiresAt`
 * moves forward as the user works, but a cookie's `Max-Age` is fixed by the
 * response that set it: without re-arming, the browser would discard the
 * credential at login + one lifetime and sign an ACTIVE user out mid-task,
 * which is precisely the hard cap the sliding-expiry decision rejected. The
 * server-side slide would still be happening and would simply never be
 * observable.
 */
export function setConsoleSessionCookie(
    event: IAppEvent,
    baseURL: string,
    value: string,
    ttl: number,
) : void {
    setResponseCookie(event, CONSOLE_SESSION_COOKIE, value, {
        httpOnly: true,
        sameSite: 'strict',
        secure: isSecureBaseURL(baseURL),
        path: buildConsoleSessionCookiePath(baseURL),
        maxAge: Math.floor(ttl / 1000),
    });
}

export function unsetConsoleSessionCookie(event: IAppEvent, baseURL: string) : void {
    unsetResponseCookie(event, CONSOLE_SESSION_COOKIE, { path: buildConsoleSessionCookiePath(baseURL) });
}
