/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '../../constants.ts';
import type { UserRole } from './entity.ts';

export class UserRoleValidator extends Container<
    UserRole
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'user_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'role_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );
    }
}
