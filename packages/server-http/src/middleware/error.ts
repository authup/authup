/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Next, Request, Response, send,
} from 'routup';

import {
    extendsBaseError,
} from '@ebec/http';
import { useLogger } from '@authup/server-common';
import { buildErrorResponsePayloadFromError } from '../helpers';

export function errorMiddleware(
    error: Error,
    request: Request,
    response: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: Next,
) {
    if (extendsBaseError(error)) {
        response.statusCode = error.getOption('statusCode') || 500;

        const logMessage = error.getOption('logMessage');
        if (logMessage) {
            useLogger().error(`${error.message}`);
        }
    }

    send(response, buildErrorResponsePayloadFromError(error));
}
