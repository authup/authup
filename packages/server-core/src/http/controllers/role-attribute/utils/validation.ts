/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import { RoleAttributeEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class RoleAttributeRequestValidator extends RequestDatabaseValidator<
RoleAttributeEntity
> {
    constructor() {
        super(RoleAttributeEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 });

        this.addTo(RequestHandlerOperation.CREATE, 'role_id')
            .exists()
            .isUUID();

        this.add('value')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true });
    }
}
