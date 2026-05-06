/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import { defineErrorHandler } from 'routup';
import { useLogger } from '@authup/server-kit';
import type { AuthupError } from '@authup/errors';
import { sanitizeError } from '../../../../utils/index.ts';

export function registerErrorMiddleware(router: Router) {
    router.use(defineErrorHandler((error, event) => {
        const next : AuthupError = sanitizeError(error.cause ?? error);

        const payload = next.toJSON();

        const isServerError = next.status >= 500 && next.status < 600;
        if (isServerError) {
            useLogger().error(next);
            payload.message = 'An internal server error occurred.';
        }

        event.response.status = next.status;
        return payload;
    }));
}
