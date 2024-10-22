/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type {
    RobotPermissionEntity,
} from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class RobotPermissionRequestValidator extends Container<
RobotPermissionEntity
> {
    constructor(options: ContainerOptions<RobotPermissionEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount(
            'robot_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount(
            'permission_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()),
        );

        this.mount('policy_id', createValidator((chain) => chain
            .isUUID()
            .optional({ values: 'null' })
            .default(null)));
    }
}
