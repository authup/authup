/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { ClientRole } from '@authup/core-kit';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class ClientRoleRequestValidator extends Container<
    ClientRole
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'clientId',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'roleId',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );
    }
}
