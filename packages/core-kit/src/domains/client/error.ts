/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorOptions } from '@authup/errors';
import { AuthupError, ErrorCode, markInstanceof } from '@authup/errors';

export const CLIENT_ERROR_INSTANCE = Symbol.for('@authup/core-kit/ClientError');

export class ClientError extends AuthupError {
    constructor(options: AuthupErrorOptions = {}) {
        super(options);
        markInstanceof(this, CLIENT_ERROR_INSTANCE);
    }

    static credentialsInvalid() {
        return new ClientError({
            code: ErrorCode.ENTITY_CREDENTIALS_INVALID,
            message: 'The client credentials are invalid.',
        });
    }

    static invalid() {
        return new ClientError({
            code: ErrorCode.OAUTH_CLIENT_INVALID,
            message: 'The client is invalid.',
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
