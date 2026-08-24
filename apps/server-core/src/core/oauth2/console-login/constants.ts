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
