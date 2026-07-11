/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { OAuth2ClientUnauthorizedError } from '@authup/specs';

/**
 * Enforce the client's grant_types allowlist (RFC 6749 §5.2
 * unauthorized_client). A null/empty column means allow-all, so
 * enforcement is opt-in per client; unknown values in the list are
 * inert — they can only narrow, never widen.
 */
export function assertClientGrantAllowed(client: Pick<Client, 'grant_types'>, grantType: string): void {
    if (!client.grant_types) {
        return;
    }

    const allowed = client.grant_types.split(/[\s,]+/);
    if (!allowed.includes(grantType)) {
        throw OAuth2ClientUnauthorizedError.grantType(grantType);
    }
}
