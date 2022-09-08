/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';

export class ValidatorError<T extends Record<string, any>> extends BadRequestError {
    constructor(context: {
        key: keyof T,
        value?: unknown,
    }) {
        super({
            message: `The value of param ${String(context.key)} is not valid.`,
        });
    }
}
