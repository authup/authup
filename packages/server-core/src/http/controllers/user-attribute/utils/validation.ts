/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import { UserAttributeEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class UserAttributeRequestValidator extends RequestDatabaseValidator<
UserAttributeEntity
> {
    constructor() {
        super(UserAttributeEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'name')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 255 });

        this.addTo(RequestHandlerOperation.CREATE, 'user_id')
            .isUUID()
            .optional({ values: 'null' });

        this.add('value')
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 3, max: 512 })
            .optional({ nullable: true });
    }
}
