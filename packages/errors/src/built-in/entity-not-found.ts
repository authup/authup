/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import { ErrorCode } from '../constants.ts';
import { AuthupError } from '../module.ts';
import type { AuthupEntityErrorOptions } from '../types.ts';

export const ENTITY_NOT_FOUND_ERROR_INSTANCE = Symbol.for('@authup/errors/EntityNotFoundError');

export class EntityNotFoundError extends AuthupError {
    constructor(input?: string | AuthupEntityErrorOptions) {
        const options: AuthupEntityErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        const { entity, ...rest } = options;
        super({
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: entity ? `The ${entity} was not found.` : 'Entity not found.',
            ...rest,
        });
        markInstanceof(this, ENTITY_NOT_FOUND_ERROR_INSTANCE);
    }
}
