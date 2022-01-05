/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MatchedDataOptions, matchedData } from 'express-validator';
import { deleteUndefinedObjectProperties } from '@typescript-auth/common';
import { ExpressRequest } from '../../http';

export function matchedValidationData(
    req: ExpressRequest,
    options?: Partial<MatchedDataOptions>,
) : Record<string, any> {
    return deleteUndefinedObjectProperties(matchedData(req, options));
}
