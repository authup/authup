/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import { REALM_SCOPE } from '../permission';
import type { RobotPermission } from './entity.ts';

export class RobotPermissionValidator extends Container<
    RobotPermission
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'robotId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'permissionId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'policyId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'realmScope',
            { optional: true },
            createValidator(z.enum(REALM_SCOPE)),
        );
    }
}
