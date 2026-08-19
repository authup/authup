/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lifetime of a pending federated login (plan 094).
 *
 * The handle is redeemed by the very next page load, so it needs to cover a
 * redirect and a bootstrap, not a user's attention span. It is also the
 * lifetime of the session the callback creates, so an abandoned login
 * self-expires and is swept with the regular session sweep; redemption
 * extends it to the full session lifetime.
 */
export const OAUTH2_FEDERATED_LOGIN_HANDLE_TTL = 1000 * 60 * 5;
