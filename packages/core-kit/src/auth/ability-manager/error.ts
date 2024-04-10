/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Input } from '@ebec/http';
import { BaseError } from '@ebec/http/core';
import { ErrorCode } from '../../error';

export class AbilityError extends BaseError {
    constructor(...input: Input[]) {
        super({
            code: ErrorCode.ABILITY_INVALID,
        }, ...input);
    }

    static buildMeta() {
        return new AbilityError({
            message: 'The ability meta could not be built.',
        });
    }
}
