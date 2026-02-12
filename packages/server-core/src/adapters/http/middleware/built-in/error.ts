/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isObject,
} from '@authup/kit';
import type {
    Router,
} from 'routup';
import {
    errorHandler, send,
} from 'routup';
import { useLogger } from '@authup/server-kit';
import type { AuthupError } from '@authup/errors';
import type { Issue } from 'validup';
import { sanitizeError } from '../../../../utils/index.ts';

type ErrorResponsePayload = {
    statusCode: number,
    code: string,
    message: string,
    issues: Issue[],
    [key: string]: any
};

export function registerErrorMiddleware(router: Router) {
    router.use(errorHandler((
        error,
        request,
        response,
    ) => {
        let next : AuthupError;
        if (error.cause) {
            next = sanitizeError(error.cause);
        } else {
            next = sanitizeError(error);
        }

        const payload : ErrorResponsePayload = {
            statusCode: next.statusCode,
            code: `${next.code}`,
            message: next.message,
            issues: next.issues,
        };

        const isServerError = next.statusCode >= 500 && next.statusCode < 600;
        if (isServerError) {
            useLogger().error(next);

            payload.message = 'An internal server error occurred.';
        } else if (isObject(next.data)) {
            const keys = Object.keys(next.data);
            for (let i = 0; i < keys.length; i++) {
                payload[keys[i]] = next.data[keys[i]];
            }
        }

        response.statusCode = payload.statusCode;
        return send(response, payload);
    }));
}
