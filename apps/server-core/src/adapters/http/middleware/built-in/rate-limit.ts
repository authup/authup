/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/rate-limit';
import { rateLimit } from '@routup/rate-limit';
import type { IApp, IAppEvent } from 'routup';
import { getRequestIP } from 'routup';
import { merge } from 'smob';
import { useRequestIdentity } from '../../request/index.ts';

// IPv4 127.0.0.0/8, `::1`, and the IPv4-mapped form a dual-stack socket
// reports. Anchored and octet-checked rather than a `127.` prefix test: a
// sloppy match here is a way past the limiter, not a cosmetic detail.
const LOOPBACK_IP = /^(?:::1|(?:::ffff:)?127(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})$/i;

/**
 * Whether the request originated inside the deployment itself.
 *
 * BOTH addresses must be loopback, and each rules out the other's failure.
 * The socket address (`trustProxy: false`) cannot be forged by a header, so
 * a directly exposed server cannot be handed `X-Forwarded-For: 127.0.0.1`
 * and skipped. The trust-contract address cannot be assumed loopback just
 * because the connection was: a reverse proxy on the same host reaches the
 * server over loopback for every visitor, and skipping on the socket alone
 * would turn the limiter off deployment-wide there.
 */
function isLoopbackRequest(event: IAppEvent) : boolean {
    return LOOPBACK_IP.test(getRequestIP(event, { trustProxy: false }) || '') &&
        LOOPBACK_IP.test(getRequestIP(event) || '');
}

export function registerRateLimitMiddleware(router: IApp, input?: OptionsInput) {
    let options : OptionsInput = {
        // @routup/rate-limit's default keyGenerator hardcodes
        // `{ trustProxy: true }`; deriving the key here instead lets it
        // follow the app-level trust contract (config `trustProxy`).
        keyGenerator: (event) => getRequestIP(event) || '127.0.0.1',
        // A loopback source is by construction the deployment itself: the
        // hosted auth pages render through the auth console's internal
        // client and server-core's own self-calls ride the same address, so
        // counting them collapses the whole deployment onto one anonymous
        // bucket of 1200/min -- 20 page renders per second, however many
        // distinct visitors there are.
        skip: isLoopbackRequest,
        max(event) {
            const identity = useRequestIdentity(event);
            if (!identity) {
                return 60 * 20; // 20 req. p. sec
            }

            switch (identity.type) {
                case 'client': {
                    return 60 * 5_000; // 1000 req p. sec
                }
                case 'user':
                default: {
                    return 60 * 100; // 100 req p. sec
                }
            }
        },
        windowMs: 60 * 1000, // 60 sec
    };

    options = merge(input || {}, options);

    router.use(rateLimit(options));
}
