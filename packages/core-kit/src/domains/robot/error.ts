/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import { ErrorCode } from '../../error';

export class RobotError extends BadRequestError {
    static credentialsInvalid() {
        return new RobotError({
            code: ErrorCode.CREDENTIALS_INVALID,
            message: 'The robot credentials are invalid.',
        });
    }

    static inactive() {
        return new RobotError({
            code: ErrorCode.ENTITY_INACTIVE,
            message: 'The robot account is inactive.',
        });
    }
}
