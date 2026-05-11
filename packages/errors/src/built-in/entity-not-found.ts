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

export const ENTITY_NOT_FOUND_ERROR_INSTANCE = Symbol.for('@authup/errors/EntityNotFoundError');

export class EntityNotFoundError extends AuthupError {
    constructor(input?: string | AuthupErrorOptions) {
        const options: AuthupErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        super({
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: 'Entity not found.',
            ...options,
        });
        markInstanceof(this, ENTITY_NOT_FOUND_ERROR_INSTANCE);
    }
}
