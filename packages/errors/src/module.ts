/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorInput } from './types.ts';
import {
    BaseError,
    markInstanceof,
} from '@ebec/core';

export const AUTHUP_ERROR_INSTANCE = Symbol.for('@authup/errors/AuthupError');

export class AuthupError extends BaseError {
    public readonly data?: Record<string, any>;

    constructor(input?: AuthupErrorInput) {
        super(input);
        markInstanceof(this, AUTHUP_ERROR_INSTANCE);

        if (input && typeof input !== 'string' && input.data) {
            this.data = input.data;
        }
    }

    /**
     * The `data` payload is spread first, so a `data` key cannot displace a
     * base field (`name`, `message`, `code`, the serialized marker chain).
     */
    override toJSON() : ReturnType<BaseError['toJSON']> & Record<string, any> {
        return {
            ...(this.data ?? {}),
            ...super.toJSON(),
        };
    }
}
