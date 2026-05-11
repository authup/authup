/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupErrorOptions } from '@authup/errors';
import { AuthupError, ErrorCode, markInstanceof } from '@authup/errors';

export const ROBOT_ERROR_INSTANCE = Symbol.for('@authup/core-kit/RobotError');

export class RobotError extends AuthupError {
    constructor(options: AuthupErrorOptions = {}) {
        super(options);
        markInstanceof(this, ROBOT_ERROR_INSTANCE);
    }

    static credentialsInvalid() {
        return new RobotError({
            code: ErrorCode.ENTITY_CREDENTIALS_INVALID,
            message: 'The robot credentials are invalid.',
        });
    }

    static notFound() {
        return new RobotError({
            code: ErrorCode.ENTITY_NOT_FOUND,
            message: 'The robot account was not found.',
        });
    }

    static inactive() {
        return new RobotError({
            code: ErrorCode.ENTITY_INACTIVE,
            message: 'The robot account is inactive.',
        });
    }
}
