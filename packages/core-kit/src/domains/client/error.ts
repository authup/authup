/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode } from '@authup/errors';

export class ClientError extends AuthupError {
    static credentialsInvalid() {
        return new ClientError({
            code: ErrorCode.ENTITY_CREDENTIALS_INVALID,
            message: 'The client credentials are invalid.',
        });
    }

    static notFound() {
        return new ClientError({
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: 'The client account was not found.',
        });
    }

    static inactive() {
        return new ClientError({
            code: ErrorCode.ENTITY_INACTIVE,
            message: 'The client account is inactive.',
        });
    }
}
