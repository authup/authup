/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Router,
} from 'routup';
import { errorHandler, send } from 'routup';
import { useLogger } from '@authup/server-core';
import { buildResponseErrorPayloadFromError } from '../../response';

export function registerErrorMiddleware(router: Router) {
    router.use(errorHandler((
        error,
        request,
        response,
        _next,
    ) => {
        if (error.logMessage) {
            useLogger().error(`${error.message}`);
        }

        const data = buildResponseErrorPayloadFromError(error);
        response.statusCode = data.statusCode;

        return send(response, data);
    }));
}
