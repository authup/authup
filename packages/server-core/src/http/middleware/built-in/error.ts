/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType, PermissionError, isObject,
} from '@authup/kit';
import type {
    Router,
} from 'routup';
import {
    errorHandler, send,
} from 'routup';
import { useLogger } from '@authup/server-kit';
import { EntityRelationLookupError } from 'typeorm-extension';
import { ValidupNestedError } from 'validup';

export function registerErrorMiddleware(router: Router) {
    router.use(errorHandler((
        error,
        request,
        response,
    ) => {
        if (error.statusCode >= 500 && error.statusCode < 600) {
            useLogger().error(error);

            if (error.cause) {
                useLogger().error(error.cause);
            }
        }

        if (error.cause instanceof PermissionError) {
            error.expose = true;

            if (
                error.cause.policy &&
                error.cause.policy.type === BuiltInPolicyType.IDENTITY
            ) {
                error.statusCode = 401;
            } else {
                error.statusCode = 403;
            }
        }

        if (error.cause instanceof EntityRelationLookupError) {
            error.expose = true;
            error.statusCode = 400;
        }

        if (error.cause instanceof ValidupNestedError) {
            error.expose = true;
            error.statusCode = 400;
            error.data = {
                children: error.cause.children,
                attributes: error.cause.children.map((child) => child.pathAbsolute),
            };
        }

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

        const isServerError = (typeof error.expose !== 'undefined' && !error.expose) ||
            (error.statusCode >= 500 && error.statusCode < 600);

        if (isServerError) {
            error.message = 'An internal server error occurred.';
        }

        response.statusCode = error.statusCode;

        return send(response, {
            statusCode: error.statusCode,
            code: `${error.code}`,
            message: error.message,
            ...(isObject(error.data) && !isServerError ? error.data : {}),
        });
    }));
}
