/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ConflictError } from '@ebec/http';

export class DatabaseConflictError extends ConflictError {
    constructor() {
        super('A db entry with some unique attributes already exist.');
    }
}
