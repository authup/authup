/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type {
    RolePermissionEntity,
} from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class RolePermissionRequestValidator extends Container<
RolePermissionEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'role_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'permission_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'policy_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );
    }
}
