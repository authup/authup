/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/rate-limit';
import { rateLimit } from '@routup/rate-limit';
import type { Request, Router } from 'routup';
import { merge } from 'smob';
import { useRequestIdentity } from '../../request';

export function registerRateLimitMiddleware(router: Router, input?: OptionsInput) {
    let options : OptionsInput = {
        max(req: Request) {
            const identity = useRequestIdentity(req);
            if (!identity) {
                return 60 * 20; // 20 req. p. sec
            }

            switch (identity.type) {
                case 'robot':
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
