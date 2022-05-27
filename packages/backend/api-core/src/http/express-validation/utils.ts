/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MatchedDataOptions, matchedData } from 'express-validator';
import { deleteUndefinedObjectProperties } from '@authelion/common';
import { ExpressRequest } from '../type';

export function buildExpressValidationErrorMessage<
    T extends Record<string, any> = Record<string, any>,
    >(name: keyof T | (keyof T)[]) {
    const names = Array.isArray(name) ? name : [name];

    if (names.length > 1) {
        return `The parameters ${names.join(', ')} is invalid.`;
    }
    return `The parameter ${String(names[0])} is invalid.`;
}

export function matchedValidationData(
    req: ExpressRequest,
    options?: Partial<MatchedDataOptions>,
): Record<string, any> {
    return deleteUndefinedObjectProperties(matchedData(req, options));
}
