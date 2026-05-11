/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Router } from 'routup';
import { defineErrorHandler } from 'routup';
import { useLogger } from '@authup/server-kit';
import { httpStatusFromCode } from '@authup/errors';
import { sanitizeError } from '../../../../utils/index.ts';

export function registerErrorMiddleware(router: Router) {
    router.use(defineErrorHandler((error, event) => {
        const next = sanitizeError(error.cause ?? error);
        const status = httpStatusFromCode(next.code);

        const payload = next.toJSON();

        if (status >= 500) {
            useLogger().error(next);
            payload.message = 'An internal server error occurred.';
        }

        event.response.status = status;
        return payload;
    }));
}
