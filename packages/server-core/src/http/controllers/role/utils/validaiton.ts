/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isValidRoleName,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { RequestDatabaseValidator, type RequestValidatorExecuteOptions } from '../../../../core';
import { RoleEntity } from '../../../../domains';
import {
    buildRequestValidationErrorMessage,
} from '../../../validation';
import { RequestHandlerOperation } from '../../../request';

export class RoleRequestValidator extends RequestDatabaseValidator<
RoleEntity
> {
    constructor() {
        super(RoleEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({
                min: 3,
                max: 256, // todo: verify this
            })
            .custom((value) => {
                const isValid = isValidRoleName(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [A-Za-z0-9-_]+ are allowed.');
                }

                return isValid;
            })
            .optional({ nullable: true });

        this.add('description')
            .optional({ nullable: true })
            .notEmpty()
            .isString()
            .isLength({
                min: 5,
                max: 4096,
            });

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional({ nullable: true })
            .default(null);
    }

    async execute(req: Request, options: RequestValidatorExecuteOptions<RoleEntity> = {}): Promise<RoleEntity> {
        const data = await super.execute(req, options);

        if (options.group === RequestHandlerOperation.CREATE && !data.name) {
            throw new BadRequestError(buildRequestValidationErrorMessage('name'));
        }

        return data;
    }
}
