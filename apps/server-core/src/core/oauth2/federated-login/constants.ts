/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lifetime of a pending federated login (plan 094).
 *
 * It is completed by the very next page load, so it needs to cover a redirect
 * and a bootstrap, not a user's attention span. It is also the lifetime of the
 * session the callback creates, so an abandoned login self-expires and is
 * swept with the regular session sweep; completion extends it to the full
 * session lifetime.
 */
export const OAUTH2_FEDERATED_LOGIN_TTL = 1000 * 60 * 5;

/**
 * The cookie carrying the pending login between the provider callback and the
 * hosted page that completes it.
 *
 * A cookie rather than a query parameter, which is what Keycloak and Authentik
 * both do: the browser that STARTED the login is the only one that can present
 * it, no other origin can set it, and nothing redeemable travels in a URL that
 * reaches history, logs or a referrer. `SameSite=Lax` keeps it off cross-site
 * requests, so a page on another origin cannot drive the completion.
 */
export const OAUTH2_FEDERATED_LOGIN_COOKIE = 'authup_federated_login';
