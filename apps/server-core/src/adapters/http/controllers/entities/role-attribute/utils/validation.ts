/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { RoleAttribute } from '@authup/core-kit';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class RoleAttributeRequestValidator extends Container<
    RoleAttribute
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.string().min(3).max(255)),
        );

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'value',
            { optional: true },
            createValidator(z.string().min(3).max(512).nullable()),
        );
    }
}
