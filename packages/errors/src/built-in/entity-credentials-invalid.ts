/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import { ErrorCode } from '../constants.ts';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const ENTITY_CREDENTIALS_INVALID_ERROR_INSTANCE = Symbol.for('@authup/errors/EntityCredentialsInvalidError');

export class EntityCredentialsInvalidError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        super({
            code: ErrorCode.ENTITY_CREDENTIALS_INVALID,
            message: 'Credentials are invalid.',
            ...options,
        });
        markInstanceof(this, ENTITY_CREDENTIALS_INVALID_ERROR_INSTANCE);
    }
}
