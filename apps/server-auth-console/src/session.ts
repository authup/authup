/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getClientErrorCode } from '@authup/core-http-kit';
import type { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { SESSION_FORWARDING_REJECTED_MAX, SESSION_FORWARDING_WINDOW } from './constants';
import type { SessionForwardingGuard, SessionForwardingGuardOptions } from './types';

/**
 * Whether the API refused a forwarded bearer as a credential nobody issued.
 * It mirrors what server-core's first rate-limit stage counts: an expired or
 * revoked token, or one whose signing key stopped verifying, was issued, so
 * the API does not count it and neither does this guard.
 */
function isRejectedBearer(err: unknown) : boolean {
    if (
        typeof err !== 'object' ||
        err === null ||
        !('response' in err) ||
        typeof err.response !== 'object' ||
        err.response === null ||
        !('status' in err.response) ||
        err.response.status !== 401
    ) {
        return false;
    }

    const code = getClientErrorCode(err);
    return code !== ErrorCode.JWT_EXPIRED && code !== ErrorCode.JWT_INACTIVE;
}

/**
 * Bounds the bearers a render forwards that the API refuses.
 *
 * A render resolves the visitor's session with their forwarded access token,
 * and on a split deployment every such call reaches the API from this
 * service's one address. server-core counts a refused bearer against the
 * address it came from, so without a bound anyone sending junk access-token
 * cookies would push the console's address over the API's failed
 * authentication limit and lock every hosted page out of the API.
 *
 * Past the limit the guard stops forwarding the cookie for the rest of the
 * window, so a page renders logged out, which is what a token that does not
 * verify renders anyway; the browser restores the session on hydration.
 */
export function createSessionForwardingGuard(
    options: SessionForwardingGuardOptions = {},
) : SessionForwardingGuard {
    const max = options.max ?? SESSION_FORWARDING_REJECTED_MAX;
    const window = options.window ?? SESSION_FORWARDING_WINDOW;
    const now = options.now ?? (() => Date.now());

    let windowStart = 0;
    let rejected = 0;

    const roll = () => {
        const time = now();
        if (time - windowStart >= window) {
            windowStart = time;
            rejected = 0;
        }
    };

    return {
        allows() {
            roll();
            return rejected < max;
        },
        observe(client: Client) {
            client.on('responseError', (err) => {
                if (isRejectedBearer(err)) {
                    roll();
                    rejected += 1;
                }

                throw err;
            });

            return client;
        },
    };
}
