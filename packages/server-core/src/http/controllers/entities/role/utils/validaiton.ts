/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isRoleNameValid,
} from '@authup/core-kit';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { RoleEntity } from '../../../../../database/domains';
import { RequestHandlerOperation } from '../../../../request';

export class RoleRequestValidator extends Container<
RoleEntity
> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isString()
                .isLength({
                    min: 3,
                    max: 128,
                })
                .custom((value) => isRoleNameValid(value, { throwOnFailure: true }));
        });

        this.mount('name', { group: RequestHandlerOperation.CREATE }, nameValidator);
        this.mount('name', { group: RequestHandlerOperation.UPDATE, optional: true }, nameValidator);

        this.mount(
            'display_name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isString()
                    .isLength({ min: 3, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .optional({ values: 'null' })
                    .notEmpty()
                    .isString()
                    .isLength({
                        min: 5,
                        max: 4096,
                    });
            }),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE, optional: true },
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
