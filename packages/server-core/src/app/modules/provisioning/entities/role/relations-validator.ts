/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import zod from 'zod';
import type { RoleProvisioningRelations } from './types.ts';

export class RoleProvisioningRelationsValidator extends Container<RoleProvisioningRelations> {
    constructor(options: ContainerOptions<RoleProvisioningRelations> = {}) {
        super(options);
    }

    protected initialize() {
        this.mount('realmPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));

        this.mount('globalPermissions', { optional: true }, createValidator(
            zod.array(zod.string()),
        ));
    }
}
