/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { RobotPermissionEntity } from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class RobotPermissionRequestValidator extends Container<
    RobotPermissionEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'robot_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'permission_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'policy_id',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );
    }
}
