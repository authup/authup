/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getClientErrorCode } from '@authup/core-http-kit';
import type { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { isObject } from '@authup/kit';
import { SESSION_FORWARDING_REJECTED_MAX, SESSION_FORWARDING_WINDOW } from './constants';
import type { SessionForwardingGuard, SessionForwardingGuardOptions } from './types';

/**
 * Whether the API refused a forwarded bearer as a credential nobody issued.
 * It mirrors what server-core's first rate-limit stage counts: an expired or
 * revoked token, or one whose signing key stopped verifying, was issued, so
 * the API does not count it and neither does this guard.
 */
function isRejectedBearer(err: unknown) : boolean {
    if (!isObject(err) || !isObject(err.response) || err.response.status !== 401) {
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
 * A render reserves capacity before it forwards and returns it once it is
 * done, so renders still waiting for the API count against the limit as well:
 * otherwise a burst of parallel renders would all forward before the first
 * refusal came back. Past the limit a page renders without the cookie, which
 * is what a token that does not verify renders anyway; the browser restores
 * the session on hydration.
 */
export function createSessionForwardingGuard(
    options: SessionForwardingGuardOptions = {},
) : SessionForwardingGuard {
    const max = options.max ?? SESSION_FORWARDING_REJECTED_MAX;
    const window = options.window ?? SESSION_FORWARDING_WINDOW;
    const now = options.now ?? (() => Date.now());

    let windowStart = 0;
    let rejected = 0;
    let inflight = 0;

    const roll = () => {
        const time = now();
        if (time - windowStart >= window) {
            windowStart = time;
            rejected = 0;
        }
    };

    return {
        reserve() {
            roll();
            if (rejected + inflight >= max) {
                return undefined;
            }

            inflight += 1;

            let released = false;
            return () => {
                if (released) {
                    return;
                }

                released = true;
                inflight -= 1;
            };
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
