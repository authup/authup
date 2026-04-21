/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '../../constants.ts';
import type { PermissionPolicy } from './entity.ts';

export class PermissionPolicyValidator extends Container<
    PermissionPolicy
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'permission_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'policy_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );
    }
}
