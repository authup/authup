/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@ebec/http';
import type { Request } from 'routup';
import type { RequestValidatorExecuteOptions } from '../../../../core';
import { RequestDatabaseValidator } from '../../../../core';
import { PermissionEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { RequestHandlerOperation } from '../../../request';

export class PermissionRequestValidator extends RequestDatabaseValidator<
PermissionEntity
> {
    constructor() {
        super(PermissionEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .exists()
            .isString()
            .isLength({ min: 3, max: 128 })
            .optional({ values: 'null' });

        this.add('description')
            .isString()
            .isLength({ min: 5, max: 4096 })
            .optional({ values: 'null' });

        this.add('client_id')
            .isUUID()
            .optional({ values: 'null' });

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .isUUID()
            .optional({ values: 'null' });

        this.add('policy_id')
            .optional({ values: 'null' })
            .isUUID();
    }

    async execute(req: Request, options: RequestValidatorExecuteOptions<PermissionEntity> = {}): Promise<PermissionEntity> {
        const data = await super.execute(req, options);

        if (options.group === RequestHandlerOperation.CREATE && !data.name) {
            throw new BadRequestError(buildErrorMessageForAttribute('name'));
        }

        return data;
    }
}
