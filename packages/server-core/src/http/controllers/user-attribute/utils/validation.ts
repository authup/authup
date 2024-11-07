/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { UserAttributeEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class UserAttributeRequestValidator extends Container<
UserAttributeEntity
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
            'user_id',
            { group: RequestHandlerOperation.CREATE, optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
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
                    .optional({ nullable: true });
            }),
        );
    }
}
