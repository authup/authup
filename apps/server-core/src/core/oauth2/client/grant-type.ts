/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { OAuth2ClientUnauthorizedError, OAuth2TokenGrant } from '@authup/specs';

/**
 * Grants a client must list explicitly: a null or empty `grant_types`
 * column does NOT enable them, the one exception to the allow-all rule
 * below. A grant lands here when enabling it on every existing client at
 * upgrade would widen an attack surface the client never asked for.
 */
export const OPT_IN_GRANT_TYPES : ReadonlySet<string> = new Set<`${OAuth2TokenGrant}`>([
    OAuth2TokenGrant.DEVICE_CODE,
]);

/**
 * Enforce the client's grant_types allowlist (RFC 6749 §5.2
 * unauthorized_client). A null/empty column means allow-all, so
 * enforcement is opt-in per client; unknown values in the list are
 * inert: they can only narrow, never widen. The grants in
 * `OPT_IN_GRANT_TYPES` invert that default and need an explicit entry.
 */
export function assertClientGrantAllowed(client: Pick<Client, 'grantTypes'>, grantType: string): void {
    if (!client.grantTypes) {
        if (OPT_IN_GRANT_TYPES.has(grantType)) {
            throw OAuth2ClientUnauthorizedError.grantType(grantType);
        }

        return;
    }

    const allowed = client.grantTypes.split(/[\s,]+/);
    if (!allowed.includes(grantType)) {
        throw OAuth2ClientUnauthorizedError.grantType(grantType);
    }
}
