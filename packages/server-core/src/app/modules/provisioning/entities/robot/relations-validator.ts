/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import type { RobotProvisioningRelations } from './types.ts';

export class RobotProvisioningRelationsValidator extends Container<RobotProvisioningRelations> {
    protected initialize() {
        super.initialize();

        this.mount('realmPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('realmRoles', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('globalRoles', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));
    }
}
