/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import {
    UserRoleEntity,
} from '../../../../domains';

import { RequestHandlerOperation } from '../../../request';

export class UserRoleRequestValidator extends RequestDatabaseValidator<
UserRoleEntity
> {
    constructor() {
        super(UserRoleEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'user_id')
            .exists()
            .isUUID();

        this.addTo(RequestHandlerOperation.CREATE, 'role_id')
            .exists()
            .isUUID();
    }
}
