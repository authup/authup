/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lifetime of a pending console login (plan 088).
 *
 * It covers one redirect to `/authorize` and the return leg, which may
 * traverse an external identity provider, so it is sized like the federated
 * login's pending entry rather than like a session.
 */
export const CONSOLE_LOGIN_TTL = 1000 * 60 * 5;

/**
 * The cookie carrying the pending login between the server-side kick and the
 * server-side callback that redeems the code.
 *
 * `SameSite=Lax` (the federated-login precedent): the return leg is a
 * top-level navigation that may come back through an external provider, which
 * a `Strict` cookie would not accompany. It holds nothing but the id of a
 * single-use cache entry.
 */
export const CONSOLE_LOGIN_COOKIE = 'authup_console_login';

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
export const CONSOLE_SESSION_COOKIE = 'authup_console_session';

/**
 * Length of the opaque session credential, in nanoid characters. 48 chars of
 * the default 36-symbol alphabet is ~248 bits. The credential is presented on
 * every request and never rotated within a session, so it is sized well past
 * the point where guessing is the weakest link.
 */
export const CONSOLE_SESSION_SECRET_LENGTH = 48;

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
export const CONSOLE_SESSION_REFRESH_THROTTLE = 1000 * 60;
