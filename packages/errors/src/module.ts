/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { Issue } from 'validup';
import type { AuthupErrorOptionsInput } from './types.ts';

export class AuthupError extends BadRequestError {
    public readonly issues : Issue[];

    public data?: Record<string, any>;

    constructor(input?: AuthupErrorOptionsInput) {
        super(input);

        this.issues = [];

        if (typeof input === 'object' && input !== null && 'data' in input) {
            this.data = (input as { data?: Record<string, any> }).data;
        }
    }
}
