/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'routup';
import { defineErrorHandler } from 'routup';
import type { Logger } from '@authup/server-kit';
import { ErrorCode, httpStatusFromCode, serializeError } from '@authup/errors';
import { isJWTErrorCode } from '@authup/specs';
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

        // RFC 6750 §3: a 401 from a protected resource carries the Bearer
        // challenge, which nothing here emitted. Gated on the request actually
        // being one - the token endpoint answers 401 for a bad client secret
        // (RFC 6749 §5.2) and that is not a bearer failure, so it must not be
        // stamped.
        if (status === 401) {
            const authorization = event.headers.get('authorization');

            if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) {
                // Quoted-string, and `message` can carry a third-party string
                // (a JWT library's own words), so the two characters that could
                // break out of it go.
                const description = String(payload.message ?? '').replace(/["\\]/g, '');
                const code = isJWTErrorCode(next.code) ? 'invalid_token' : 'invalid_request';

                event.response.headers.set(
                    'www-authenticate',
                    `Bearer error="${code}", error_description="${description}"`,
                );
            } else if (!authorization && next.code === ErrorCode.IDENTITY_UNAUTHORIZED) {
                // §3 again: a request that presented no credentials at all gets
                // the bare challenge, with no error code to report.
                event.response.headers.set('www-authenticate', 'Bearer');
            }
        }

        event.response.status = status;
        return payload;
    }));
}
