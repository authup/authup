/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RequestDatabaseValidator } from '../../../../core';
import { RobotEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class RobotRequestValidator extends RequestDatabaseValidator<
RobotEntity
> {
    constructor() {
        super(RobotEntity);

        this.mount();
    }

    mount() {
        this.add('secret')
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 256 })
            .optional();

        this.add('active')
            .isBoolean()
            .optional();

        this.add('name')
            .notEmpty()
            .isLength({ min: 3, max: 256 })
            .optional({ nullable: true });

        this.add('description')
            .notEmpty()
            .isLength({ min: 3, max: 4096 })
            .optional({ nullable: true });

        this.add('user_id')
            .exists()
            .isUUID()
            .optional({ nullable: true });

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional();
    }
}
