/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../constants.ts';
import { markInstanceof } from '@ebec/core';
import { AuthupError } from '../module.ts';
import type { AuthupErrorOptions } from '../types.ts';

export const ENTITY_CONFLICT_ERROR_INSTANCE = Symbol.for('@authup/errors/EntityConflictError');

export class EntityConflictError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        super({
            code: ErrorCode.ENTITY_CONFLICT,
            ...options,
        });
        markInstanceof(this, ENTITY_CONFLICT_ERROR_INSTANCE);
    }
}
