/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The cookie carrying the opaque session credential: the `secret` half of an
 * `auth_sessions` row, never its id (the id is published as `sid` in every
 * id_token and `/sessions` row, so it is an identifier and not a credential).
 *
 * `HttpOnly`, `Secure` under an https publicUrl, and `SameSite=Strict`: it is
 * an ambient credential for the whole API, so it must never ride a cross-site
 * request. See plan 088 for the full gate (`Strict` + `Origin` + a mandatory
 * `Sec-Fetch-Site: same-origin`).
 */
export const SESSION_COOKIE = 'authup_session';

/**
 * Length of the opaque session credential, in nanoid characters. 48 chars of
 * the default 36-symbol alphabet is ~248 bits. The credential is presented on
 * every request and never rotated within a session, so it is sized well past
 * the point where guessing is the weakest link.
 */
export const SESSION_SECRET_LENGTH = 48;

/**
 * How often a cookie-authenticated request slides the session's expiry.
 *
 * A bearer-mode session is kept alive by the refresh grant, which cookie mode
 * removes: `ping()` moves only `seenAt`, so an active console user would be
 * signed out mid-task once the session reached its ~3-day lifetime. The cookie
 * branch therefore calls `refresh()` instead, throttled to one write per
 * window so a page load's burst of API calls does not rewrite the row a dozen
 * times. It costs nothing extra: `ping()` was already saving the row.
 */
export const SESSION_REFRESH_THROTTLE = 1000 * 60;
