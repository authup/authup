/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';

export class DatabaseConflictError extends AuthupError {
    constructor() {
        super({
            code: ErrorCode.ENTITY_CONFLICT,
            message: 'A db entry with some unique attributes already exist.',
        });
    }
}
