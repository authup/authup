/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { RobotRole } from '@authup/core-kit';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class RobotRoleRequestValidator extends Container<
    RobotRole
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'robot_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );
    }
}
