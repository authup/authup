/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `reason` on the error body of `POST /identity-providers/:id/login-complete`
 * when the request carried no federated-login cookie, so the completion never
 * began.
 *
 * The hosted authorize page runs the completion off a `?provider=` hint alone,
 * which anyone can put in a link, and it clears the visitor's session when a
 * completion FAILS (an attempt that got as far as the pending login must not
 * leave the previous account for the ladder to consent into). Those two
 * together would make any authorize URL a one-click logout for whoever opens
 * it. This marker is how the page tells "your redemption failed" from "you
 * were never in a federated login", and it skips the logout for the latter.
 */
export const IDENTITY_PROVIDER_LOGIN_NOT_PENDING = 'identityProviderLoginNotPending';
