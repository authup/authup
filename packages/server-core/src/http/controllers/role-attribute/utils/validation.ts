/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { RoleAttributeEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class RoleAttributeRequestValidator extends Container<
RoleAttributeEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 255 });
            }),
        );

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
            'value',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString()
                    .isLength({ min: 3, max: 512 })
                    .optional({ values: 'null' });
            }),
        );
    }
}
