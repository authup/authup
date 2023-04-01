/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ebec/http';
import { BaseError, mergeOptions } from '@ebec/http';
import { ErrorCode } from '../error';

export class AbilityError extends BaseError {
    constructor(options?: Options) {
        super(mergeOptions({
            code: ErrorCode.ABILITY_INVALID,
        }, (options || {})));
    }

    static buildMeta() {
        return new AbilityError({
            message: 'The ability meta could not be built.',
        });
    }
}
