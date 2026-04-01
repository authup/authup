/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { RobotRole } from '@authup/core-kit';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class RobotRoleRequestValidator extends Container<
    RobotRole
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'robot_id',
            {
                group: RequestHandlerOperation.CREATE 
            },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'role_id',
            {
                group: RequestHandlerOperation.CREATE 
            },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );
    }
}
