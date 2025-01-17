/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError } from '@authup/protocols';
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
import { EntityRelationLookupError } from 'typeorm-extension';
import { ValidupNestedError } from 'validup';

type ErrorResponsePayload = {
    statusCode: number,
    code: string,
    message: string,
    [key: string]: any
};

export function registerErrorMiddleware(router: Router) {
    router.use(errorHandler((
        error,
        request,
        response,
    ) => {
        const payload : ErrorResponsePayload = {
            statusCode: error.statusCode,
            code: `${error.code}`,
            message: error.message,
        };

        if (error.cause instanceof PermissionError) {
            if (
                error.cause.policy &&
                error.cause.policy.type === BuiltInPolicyType.IDENTITY
            ) {
                payload.statusCode = 401;
            } else {
                payload.statusCode = 403;
            }
        } else if (error.cause instanceof EntityRelationLookupError) {
            payload.statusCode = 400;
        } else if (error.cause instanceof ValidupNestedError) {
            payload.statusCode = 400;
            payload.children = error.cause.children;
            payload.attributes = error.cause.children.map((child) => child.pathAbsolute);
        }

        // catch and decorate some db errors :)
        switch (error.code) {
            case 'ER_DUP_ENTRY':
            case 'SQLITE_CONSTRAINT_UNIQUE': {
                payload.statusCode = 409;
                payload.message = 'An entry with some unique attributes already exist.';
                break;
            }
            case 'ER_DISK_FULL':
                payload.statusCode = 507;
                payload.message = 'No database operation possible, due the leak of free disk space.';
                break;
        }

        const isServerError = payload.statusCode >= 500 && payload.statusCode < 600;
        if (isServerError) {
            useLogger().error(error);

            if (error.cause) {
                useLogger().error(error.cause);
            }

            payload.message = 'An internal server error occurred.';
        } else if (isObject(error.data)) {
            const keys = Object.keys(error.data);
            for (let i = 0; i < keys.length; i++) {
                payload[keys[i]] = error.data[keys[i]];
            }
        }

        response.statusCode = payload.statusCode;
        return send(response, payload);
    }));
}
