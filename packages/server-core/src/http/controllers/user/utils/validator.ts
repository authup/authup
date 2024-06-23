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
import { RequestDatabaseValidator } from '../../../../core';
import { UserEntity } from '../../../../domains';
import { RequestHandlerOperation } from '../../../request';

export class UserRequestValidator extends RequestDatabaseValidator<
UserEntity
> {
    constructor() {
        super(UserEntity);

        this.mount();
    }

    mount() {
        this.add('name')
            .exists()
            .notEmpty()
            .custom((value) => {
                const isValid = isValidUserName(value);
                if (!isValid) {
                    throw new BadRequestError('Only the characters [A-Za-z0-9-_.]+ are allowed.');
                }

                return isValid;
            })
            .optional({ nullable: true });

        this.add('name_locked')
            .isBoolean()
            .optional();

        // ----------------------------------------------

        this.add('first_name')
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional({ nullable: true });

        this.add('last_name')
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional({ nullable: true });

        // ----------------------------------------------

        this.add('display_name')
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 128 })
            .optional();

        // ----------------------------------------------

        this.add('email')
            .exists()
            .isEmail()
            .optional({ nullable: true });

        // ----------------------------------------------

        this.add('password')
            .exists()
            .isLength({ min: 5, max: 512 })
            .optional({ nullable: true });

        // ----------------------------------------------

        this.add('active')
            .isBoolean()
            .optional();

        this.add('name_locked')
            .isBoolean()
            .optional();

        this.addTo(RequestHandlerOperation.CREATE, 'realm_id')
            .exists()
            .isUUID()
            .optional();

        this.add('status')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true });

        this.add('status_message')
            .exists()
            .isLength({ min: 5, max: 256 })
            .optional({ nullable: true });
    }
}
