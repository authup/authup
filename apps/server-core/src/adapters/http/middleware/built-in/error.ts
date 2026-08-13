/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'routup';
import { defineErrorHandler } from 'routup';
import type { Logger } from '@authup/server-kit';
import { httpStatusFromCode, serializeError } from '@authup/errors';
import { describeError, sanitizeError } from '../../../../utils/index.ts';

type ErrorMiddlewareOptions = {
    logger?: Logger
};

export function registerErrorMiddleware(router: App, options: ErrorMiddlewareOptions = {}) {
    router.use(defineErrorHandler((error, event) => {
        // routup wraps whatever a handler threw into an AppError carrying it
        // as `cause`, so this is the error as it was actually raised.
        const original = error.cause ?? error;

        const next = sanitizeError(original);
        const status = httpStatusFromCode(next.code);

        const payload = serializeError(next);

        if (status >= 500) {
            if (options.logger) {
                // The ORIGINAL error, never the sanitized copy. Sanitizing
                // discards the transport reason and the upstream response
                // body on purpose, and those are the only things that make
                // an outbound failure diagnosable.
                options.logger.error(describeError(original));
            }
            payload.message = 'An internal server error occurred.';
        }

        event.response.status = status;
        return payload;
    }));
}
