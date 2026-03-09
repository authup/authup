/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import type { Request } from 'routup';
import { useRequestParam } from 'routup';
import { ValidupError, buildErrorMessageForAttribute, defineIssueItem } from 'validup';

type RequestIDParamOptions = {
    /**
     * default: true
     */
    isUUID?: boolean
};

export function useRequestParamID(req: Request, options: RequestIDParamOptions = {}) : string {
    const id = getRequestParamID(req, options);
    if (typeof id === 'undefined') {
        throw new ValidupError([
            defineIssueItem({
                path: ['id'],
                message: buildErrorMessageForAttribute('id'),
            }),
        ]);
    }

    return id;
}

export function getRequestParamID(req: Request, options: RequestIDParamOptions = {}) : string | undefined {
    const id = getRequestStringParam(req, 'id');
    if (!id) {
        return undefined;
    }

    options.isUUID = options.isUUID ?? true;
    if (options.isUUID && !isUUID(id)) {
        return undefined;
    }

    return id;
}

export function getRequestStringParam(req: Request, key: string) : string | undefined {
    const value = useRequestParam(req, key);
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }

    return value;
}

export function getRequestStringParamOrFail(req: Request, key: string) : string | undefined {
    const value = getRequestStringParam(req, key);
    if (typeof value === 'undefined') {
        throw new ValidupError([
            defineIssueItem({
                path: [key],
                message: buildErrorMessageForAttribute(key),
            }),
        ]);
    }

    return value;
}
