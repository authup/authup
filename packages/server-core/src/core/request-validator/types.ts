/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ContextRunner, ValidationChain } from 'express-validator';
import type { Middleware } from 'express-validator/lib/base';
import type { RequestValidatorFieldSource } from './constants';

export type RequestValidatorExecuteOptions<
    T extends Record<string, any> = Record<string, any>,
> = {
    defaults?: {
        [K in keyof T]: any
    },
    group?: string
};

export type RequestValidatorAddOptions = {
    src?: `${RequestValidatorFieldSource}`,
    group?: string
};

export type RequestValidationChain = ValidationChain;
export type RequestValidationGroup = Middleware & ContextRunner;
