/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import {
    UserPermissionEntity,
} from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class UserPermissionRequestValidator extends RequestDatabaseValidator<
UserPermissionEntity
> {
    constructor() {
        super(UserPermissionEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'user_id')
            .exists()
            .isUUID();

        this.addTo(RequestHandlerOperation.CREATE, 'permission_id')
            .exists()
            .isUUID();

        this.add('policy_id')
            .isUUID()
            .optional({ values: 'null' })
            .default(null);
    }
}
