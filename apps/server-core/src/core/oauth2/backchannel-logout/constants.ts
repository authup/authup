/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `events` member a logout token MUST carry
 * (OIDC Back-Channel Logout 1.0, section 2.4).
 */
export const OAUTH2_BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

/**
 * Logout token lifetime in seconds. The token is consumed by the RP the
 * moment it arrives, so the lifetime only bounds a replay of a captured one.
 */
export const OAUTH2_BACKCHANNEL_LOGOUT_MAX_AGE = 120;

/**
 * Per-delivery timeout in milliseconds. The revoke awaits every delivery, so
 * an unreachable RP must not hold the caller's request open for long.
 */
export const OAUTH2_BACKCHANNEL_LOGOUT_TIMEOUT = 5_000;
