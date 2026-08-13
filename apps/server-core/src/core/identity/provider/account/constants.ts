/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Lifetime of a pending account link (issue #3439).
 *
 * The handle is redeemed by the very next page load, so it needs to cover a
 * redirect and a bootstrap, not a user's attention span. The authorization
 * state's 30 minutes would leave a redeemable credential-binding handle
 * lying in browser history far longer than the flow that produced it.
 */
export const IDENTITY_PROVIDER_ACCOUNT_LINK_TTL = 1000 * 60 * 5;
