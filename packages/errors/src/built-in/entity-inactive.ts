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

export const ENTITY_INACTIVE_ERROR_INSTANCE = Symbol.for('@authup/errors/EntityInactiveError');

export class EntityInactiveError extends AuthupError {
    constructor(input?: string | AuthupEntityErrorOptions) {
        const options: AuthupEntityErrorOptions = typeof input === 'string' ? { message: input } : (input ?? {});
        const { entity, ...rest } = options;
        super({
            code: ErrorCode.ENTITY_INACTIVE,
            message: entity ? `The ${entity} is inactive.` : 'Entity is inactive.',
            ...rest,
        });
        markInstanceof(this, ENTITY_INACTIVE_ERROR_INSTANCE);
    }
}
