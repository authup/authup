/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type {
    PolicyEntity,
} from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

type PolicyValidationResult = Omit<PolicyEntity, 'children'> & {
    parent_id?: string
};

export class PolicyValidator extends Container<PolicyValidationResult> {
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
                });
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
            'invert',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean();
            }),
        );

        this.mount(
            'type',
            { group: RequestHandlerOperation.CREATE },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isString()
                    .isLength({ min: 3, max: 128 });
            }),
        );

        this.mount(
            'parent_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE },
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
