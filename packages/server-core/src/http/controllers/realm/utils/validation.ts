/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRealmNameValid } from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import { RequestDatabaseValidator, type RequestValidatorExecuteOptions } from '../../../../core';
import { RealmEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';
import {
    buildRequestValidationErrorMessage,
} from '../../../validation';

export class RealmRequestValidator extends RequestDatabaseValidator<
RealmEntity
> {
    constructor() {
        super(RealmEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 128 })
            .custom((value) => {
                const isValid = isRealmNameValid(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [a-zA-Z0-9-_]+ are allowed.');
                }

                return isValid;
            });

        this.add('description')
            .optional({ nullable: true })
            .notEmpty()
            .isString()
            .isLength({ min: 5, max: 4096 });
    }

    async execute(
        req: Request,
        options: RequestValidatorExecuteOptions<RealmEntity> = {},
    ): Promise<RealmEntity> {
        const data = await super.execute(req, options);

        if (
            options.group === RequestHandlerOperation.CREATE &&
            !data.name
        ) {
            throw new BadRequestError(buildRequestValidationErrorMessage('name'));
        }

        return data;
    }
}
