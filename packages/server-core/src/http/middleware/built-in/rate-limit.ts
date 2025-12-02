/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import type { OptionsInput } from '@routup/rate-limit';
import { rateLimit } from '@routup/rate-limit';
import type { Request, Router } from 'routup';
import { merge } from 'smob';
import { useConfig } from '../../../config';
import { useRequestIdentity } from '../../request';

export function registerRateLimitMiddleware(router: Router, input?: OptionsInput) {
    const config = useConfig();
    let options : OptionsInput = {
        skip(req: Request) {
            const identity = useRequestIdentity(req);

            return identity &&
                identity.type === 'robot' &&
                identity.realmName === REALM_MASTER_NAME &&
                !!identity.data &&
                identity.data.name === config.robotAdminName;
        },
        max(req: Request) {
            const identity = useRequestIdentity(req);
            if (identity && identity.type === 'user') {
                return 60 * 100; // 100 req p. sec
            }

            if (
                identity &&
                (identity.type === 'robot' || identity.type === 'client')
            ) {
                return 60 * 1000; // 1000 req p. sec
            }

            return 60 * 20; // 20 req p. sec
        },
        windowMs: 60 * 1000, // 60 sec
    };

    options = merge(input || {}, options);

    router.use(rateLimit(options));
}
