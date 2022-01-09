/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { Result, ValidationError } from 'express-validator';

export class ExpressValidationError extends BadRequestError {
    constructor(validation: Result<ValidationError>) {
        const errors : ValidationError[] = validation.array();
        const invalidParams: string[] = [];

        for (let i = 0; i < errors.length; i++) {
            if (invalidParams.indexOf(errors[i].param) === -1) {
                invalidParams.push(errors[i].param);
            }
        }

        let message: string;

        if (invalidParams) {
            if (invalidParams.length > 1) {
                message = `The parameters ${invalidParams.join(', ')} are not valid.`;
            } else {
                message = `The parameter ${invalidParams[0]} is not valid.`;
            }
        } else {
            message = 'An unknown validation error occurred.';
        }

        super(message);
    }
}
