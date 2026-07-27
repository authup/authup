/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorInput } from './types.ts';
import { BaseError, INSTANCEOF_PROPERTY, markInstanceof } from '@ebec/core';
import type { Issue } from 'validup';
import { serializeInstanceofChain } from './instanceof.ts';

export const AUTHUP_ERROR_INSTANCE = Symbol.for('@authup/errors/AuthupError');

export class AuthupError extends BaseError {
    public readonly issues: Issue[];

    public readonly data?: Record<string, any>;

    constructor(input?: AuthupErrorInput) {
        super(input);
        markInstanceof(this, AUTHUP_ERROR_INSTANCE);

        this.issues = [];

        if (input && typeof input !== 'string' && input.data) {
            this.data = input.data;
        }
    }

    /**
     * The class-marker chain rides along as a string list so the ancestor
     * information survives a JSON round-trip (symbols don't serialize) —
     * duck-type guards match rehydrated subclass errors through it.
     * Emitted last so a `data` key cannot displace the genuine chain.
     */
    override toJSON() {
        return {
            ...super.toJSON(),
            issues: this.issues,
            ...(this.data ?? {}),
            [INSTANCEOF_PROPERTY]: serializeInstanceofChain(this),
        };
    }
}
