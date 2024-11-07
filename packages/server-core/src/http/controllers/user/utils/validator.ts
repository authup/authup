/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isValidUserName,
} from '@authup/core-kit';
import { BadRequestError } from '@ebec/http';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';
import type { UserEntity } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';

export class UserRequestValidator extends Container<
UserEntity
> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isLength({ min: 3, max: 128 })
                .custom((value) => {
                    const isValid = isValidUserName(value);
                    if (!isValid) {
                        throw new BadRequestError('Only the characters [A-Za-z0-9-_.]+ are allowed.');
                    }

                    return isValid;
                });
        });
        this.mount(
            'name',
            { group: RequestHandlerOperation.CREATE },
            nameValidator,
        );
        this.mount(
            'name',
            { group: RequestHandlerOperation.UPDATE, optional: true },
            nameValidator,
        );

        this.mount(
            'name_locked',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean()
                    .exists();
            }),
        );

        // ----------------------------------------------

        this.mount(
            'first_name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .notEmpty()
                    .isLength({ min: 3, max: 128 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'last_name',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .notEmpty()
                    .isLength({ min: 3, max: 128 })
                    .optional({ values: 'null' });
            }),
        );

        // ----------------------------------------------

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

        // ----------------------------------------------

        this.mount(
            'email',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isEmail()
                    .optional({ values: 'null' });
            }),
        );

        // ----------------------------------------------

        this.mount(
            'password',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isLength({ min: 5, max: 512 })
                    .optional({ values: 'null' });
            }),
        );

        // ----------------------------------------------

        this.mount(
            'active',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isBoolean();
            }),
        );

        this.mount(
            'name_locked',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .isBoolean()
                    .exists();
            }),
        );

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE, optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID();
            }),
        );

        this.mount(
            'status',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isLength({ min: 5, max: 256 })
                    .optional({ values: 'null' });
            }),
        );

        this.mount(
            'status_message',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isLength({ min: 5, max: 256 })
                    .optional({ values: 'null' });
            }),
        );
    }
}
