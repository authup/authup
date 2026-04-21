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
import type { ClientRole } from './entity.ts';

export class ClientRoleValidator extends Container<
    ClientRole
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'client_id',
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
