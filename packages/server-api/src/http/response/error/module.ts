/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/core';
import { isClientError } from '@ebec/http';
import type { ErrorProxy } from 'routup';

export function buildResponseErrorPayloadFromError(error: ErrorProxy) {
    // catch and decorate some db errors :)
    switch (error.code) {
        case 'ER_DUP_ENTRY':
        case 'SQLITE_CONSTRAINT_UNIQUE': {
            error.statusCode = 409;
            error.message = 'An entry with some unique attributes already exist.';
            error.expose = true;
            break;
        }
        case 'ER_DISK_FULL':
            error.statusCode = 507;
            error.message = 'No database operation possible, due the leak of free disk space.';
            error.expose = true;
            break;
    }

    if (!error.expose) {
        error.message = 'An error occurred.';
    }

    return {
        statusCode: error.statusCode,
        code: `${error.code}`,
        message: error.message,
        ...(isObject(error.data) && isClientError(error) ? error.data : {}),
    };
}
