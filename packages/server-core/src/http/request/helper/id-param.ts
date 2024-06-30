/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { useRequestParam } from 'routup';

type RequestIDParamOptions = {
    strict?: boolean
};
export function useRequestIDParam(req: Request, options: RequestIDParamOptions = {}) : string {
    const id = useRequestParam(req, 'id');
    if (typeof id !== 'string') {
        throw new BadRequestError('The request id param is malformed.');
    }

    if (id.length === 0) {
        throw new BadRequestError('The request id param is empty.');
    }

    options.strict = options.strict ?? true;
    if (
        options.strict &&
        !isUUID(id)
    ) {
        throw new BadRequestError('The request id param is invalid.');
    }

    return id;
}
