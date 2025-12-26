/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRobotNameValid } from '@authup/core-kit';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { RobotEntity } from '../../../../../database/domains/index.ts';
import { RequestHandlerOperation } from '../../../../request/index.ts';

export class RobotRequestValidator extends Container<
RobotEntity
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'secret',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isLength({ min: 3, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'active',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean();
            }),
        );

        this.mount(
            'name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .notEmpty()
                    .isLength({ min: 3, max: 128 })
                    .optional({ nullable: true })
                    .custom((value) => isRobotNameValid(value, { throwOnFailure: true }));
            }),
        );

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
                    .notEmpty()
                    .isLength({ min: 3, max: 4096 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'user_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ nullable: true });
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
