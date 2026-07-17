/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { ClientPermissionEntity } from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class ClientPermissionRequestValidator extends Container<
    ClientPermissionEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'clientId',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'permissionId',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'policyId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );
    }
}
