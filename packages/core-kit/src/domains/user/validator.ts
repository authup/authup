/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import { USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH } from './constants';
import type { User } from './entity';
import type { UserValidatorOptions } from './types';
import { isUserNameValid } from './utils';

export class UserValidator extends Container<User> {
    declare protected options: UserValidatorOptions;

    constructor(options: UserValidatorOptions = {}) {
        super(options);
    }

    protected override initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z
                .string()
                .trim()
                .toLowerCase()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isUserNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The user name is not valid.',
                        });
                    }
                }),
        );

        this.mount(
            'name',
            { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] },
            nameValidator,
        );
        this.mount(
            'name',
            {
                group: ValidatorGroup.UPDATE,
                optional: true,
            },
            nameValidator,
        );

        this.mount(
            'nameLocked',
            { optional: true },
            createValidator(z.boolean()),
        );

        // ----------------------------------------------

        this.mount(
            'firstName',
            { optional: true },
            createValidator(z.string().min(3).max(128).nullable()),
        );

        this.mount(
            'lastName',
            { optional: true },
            createValidator(z.string().min(3).max(128).nullable()),
        );

        // ----------------------------------------------

        this.mount(
            'displayName',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        // ----------------------------------------------

        const emailValidator = createValidator(
            z.email()
                .trim()
                .toLowerCase()
                .regex(/^[^A-Z]+$/, 'Email must be lowercase.'),
        );

        this.mount(
            'email',
            { group: ValidatorGroup.CREATE },
            emailValidator,
        );
        this.mount(
            'email',
            {
                optional: true,
                group: ValidatorGroup.UPDATE,
            },
            emailValidator,
        );
        // provisioning: email is optional — the user synchronizer backfills
        // a placeholder when omitted
        this.mount(
            'email',
            {
                optional: true,
                group: ValidatorGroup.PROVISIONING,
            },
            emailValidator,
        );

        // ----------------------------------------------

        this.mount(
            'password',
            { optional: true },
            createValidator(
                z.string()
                    .min(this.options.passwordMinLength ?? USER_PASSWORD_MIN_LENGTH)
                    .max(USER_PASSWORD_MAX_LENGTH),
            ),
        );

        // ----------------------------------------------

        this.mount(
            'active',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'nameLocked',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'realmId',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid()),
        );

        this.mount(
            'status',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'statusMessage',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );
    }
}
