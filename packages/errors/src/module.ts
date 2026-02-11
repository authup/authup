/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Input } from '@ebec/http';
import { BadRequestError } from '@ebec/http';
import type { Issue } from 'validup';

export class AuthupError extends BadRequestError {
    public readonly issues : Issue[];

    constructor(...input: Input[]) {
        super(...input);

        this.issues = [];
    }
}
