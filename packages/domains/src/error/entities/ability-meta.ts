/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError, ErrorOptions, mergeErrorOptions } from '@typescript-error/core';

export class AbilityMetaError extends BaseError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            message: 'The ability meta could not be built.',
        }, (options || {})));
    }
}
