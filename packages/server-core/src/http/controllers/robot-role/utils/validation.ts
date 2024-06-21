/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import { RobotRoleEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class RobotRoleRequestValidator extends RequestDatabaseValidator<
RobotRoleEntity
> {
    constructor() {
        super(RobotRoleEntity);

        this.mount();
    }

    mount() {
        this.addTo(RequestHandlerOperation.CREATE, 'robot_id')
            .exists()
            .isUUID();

        this.addTo(RequestHandlerOperation.CREATE, 'role_id')
            .exists()
            .isUUID();
    }
}
