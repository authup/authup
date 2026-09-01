/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/rate-limit';
import { rateLimit } from '@routup/rate-limit';
import type { IApp } from 'routup';
import { getRequestIP } from 'routup';
import { merge } from 'smob';
import { useRequestIdentity } from '../../request/index.ts';

export function registerRateLimitMiddleware(router: IApp, input?: OptionsInput) {
    let options : OptionsInput = {
        // @routup/rate-limit's default keyGenerator hardcodes
        // `{ trustProxy: true }`; deriving the key here instead lets it
        // follow the app-level trust contract (config `trustProxy`).
        keyGenerator: (event) => getRequestIP(event) || '127.0.0.1',
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
