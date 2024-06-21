/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { RequestDatabaseValidator, type RequestValidatorExecuteOptions } from '../../../../core';
import { ScopeEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';
import { buildRequestValidationErrorMessage } from '../../../validation';

export class ScopeRequestValidator extends RequestDatabaseValidator<
ScopeEntity
> {
    constructor() {
        super(ScopeEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .exists()
            .notEmpty()
            .isString()
            .optional({ nullable: true });

        this.add('description')
            .optional({ nullable: true })
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 4096 });

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .isUUID()
            .optional({ values: 'null' });
    }

    async execute(
        req: Request,
        options: RequestValidatorExecuteOptions<ScopeEntity> = {},
    ): Promise<ScopeEntity> {
        const data = await super.execute(req, options);

        if (options.group === RequestHandlerOperation.CREATE && !data.name) {
            throw new BadRequestError(buildRequestValidationErrorMessage('name'));
        }

        return data;
    }
}
