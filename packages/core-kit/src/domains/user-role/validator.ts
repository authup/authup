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
import type { UserRole } from './entity.ts';

export class UserRoleValidator extends Container<
    UserRole
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'userId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'roleId',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );
    }
}
