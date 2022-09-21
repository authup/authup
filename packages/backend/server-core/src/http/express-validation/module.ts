/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import { Result, ValidationError } from 'express-validator';
import { buildExpressValidationErrorMessage } from './utils';

export class ExpressValidationError extends BadRequestError {
    constructor(validation: Result<ValidationError>) {
        let errors : ValidationError[] = validation.array();
        errors = [...new Map(errors.map((item) => [item.param, item])).values()]
            .sort((a, b) => a.param.localeCompare(b.param));

        let message: string;

        if (errors) {
            const parameterNames = errors.map((error) => error.param);

            message = buildExpressValidationErrorMessage(parameterNames);
        } else {
            message = 'An unexpected validation error occurred.';
        }

        super({
            message,
            extra: errors,
        });
    }
}
