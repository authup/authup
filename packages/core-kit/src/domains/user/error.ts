/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';

export class UserError extends AuthupError {
    static credentialsInvalid() {
        return new UserError({
            code: ErrorCode.ENTITY_CREDENTIALS_INVALID,
            message: 'The user credentials are invalid.',
        });
    }

    static notFound() {
        return new UserError({
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: 'The user account was not found.',
        });
    }

    static inactive() {
        return new UserError({
            code: ErrorCode.ENTITY_INACTIVE,
            message: 'The user account is inactive.',
        });
    }
}
