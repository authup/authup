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
import { createValidator } from '@validup/adapter-validator';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import type { UserEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class UserRequestValidator extends Container<
UserEntity
> {
    constructor(options: ContainerOptions<UserEntity> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('name', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .custom((value) => {
                const isValid = isValidUserName(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [A-Za-z0-9-_.]+ are allowed.');
                }

                return isValid;
            })
            .optional({ nullable: true })));

        this.mount('name_locked', createValidator((chain) => chain
            .isBoolean()
            .optional()));

        // ----------------------------------------------

        this.mount('first_name', createValidator((chain) => chain
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional({ nullable: true })));

        this.mount('last_name', createValidator((chain) => chain
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional({ nullable: true })));

        // ----------------------------------------------

        this.mount('display_name', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional()));

        // ----------------------------------------------

        this.mount('email', createValidator((chain) => chain
            .exists()
            .isEmail()
            .optional({ nullable: true })));

        // ----------------------------------------------

        this.mount('password', createValidator((chain) => chain
            .exists()
            .isLength({ min: 5, max: 512 })
            .optional({ nullable: true })));

        // ----------------------------------------------

        this.mount('active', createValidator((chain) => chain
            .isBoolean()
            .optional()));

        this.mount('name_locked', createValidator((chain) => chain
            .isBoolean()
            .optional()));

        this.mount(
            'realm_id',
            { group: RequestHandlerOperation.CREATE },
            createValidator((chain) => chain
                .exists()
                .isUUID()
                .optional()),
        );

        this.mount('status', createValidator((chain) => chain
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })));

        this.mount('status_message', createValidator((chain) => chain
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true })));
    }
}
