/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import type { Request } from 'routup';
import { useRequestParam } from 'routup';
import { ValidupNestedError } from 'validup';

type RequestIDParamOptions = {
    /**
     * default: true
     */
    isUUID?: boolean
};
export function useRequestParamID(req: Request, options: RequestIDParamOptions = {}) : string {
    const id = getRequestParamID(req, options);
    if (typeof id === 'undefined') {
        throw new ValidupNestedError('The request id param is not valid.');
    }

    return id;
}

export function getRequestParamID(req: Request, options: RequestIDParamOptions = {}) : string | undefined {
    const id = useRequestParam(req, 'id');
    if (typeof id !== 'string') {
        return undefined;
    }

    options.isUUID = options.isUUID ?? true;
    if (options.isUUID && !isUUID(id)) {
        return undefined;
    }

    if (id.length === 0) {
        return undefined;
    }

    return id;
}
