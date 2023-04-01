/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OptionsInput } from '@routup/prometheus';
import { createHandler, registerMetrics } from '@routup/prometheus';
import type { Router } from 'routup';
import { useRequestPath, withLeadingSlash } from 'routup';
import { merge } from 'smob';

export function registerPrometheusMiddleware(router: Router, input?: OptionsInput) {
    let options : OptionsInput = {
        skip(req) {
            const path = withLeadingSlash(useRequestPath(req));

            return path.startsWith('/authorize') || path.startsWith('/token');
        },
    };

    if (input) {
        options = merge(options, input || {});
    }

    registerMetrics(router, options);

    router.get('/metrics', createHandler(options.registry));
}
