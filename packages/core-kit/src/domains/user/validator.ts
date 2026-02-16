/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '../../constants';
import type { User } from './entity';
import { isUserNameValid } from './utils';

export class UserValidator extends Container<User> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z
                .string()
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
            { group: ValidatorGroup.CREATE },
            nameValidator,
        );
        this.mount(
            'name',
            { group: ValidatorGroup.UPDATE, optional: true },
            nameValidator,
        );

        this.mount(
            'name_locked',
            { optional: true },
            createValidator(z.boolean()),
        );

        // ----------------------------------------------

        this.mount(
            'first_name',
            { optional: true },
            createValidator(z.string().min(3).max(128).nullable()),
        );

        this.mount(
            'last_name',
            { optional: true },
            createValidator(z.string().min(3).max(128).nullable()),
        );

        // ----------------------------------------------

        this.mount(
            'display_name',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        // ----------------------------------------------

        const emailValidator = createValidator(z.email());

        this.mount(
            'email',
            { group: ValidatorGroup.CREATE },
            emailValidator,
        );
        this.mount(
            'email',
            { optional: true, group: ValidatorGroup.UPDATE },
            emailValidator,
        );

        // ----------------------------------------------

        this.mount(
            'password',
            { optional: true },
            createValidator(z.string().min(3).max(512)),
        );

        // ----------------------------------------------

        this.mount(
            'active',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'name_locked',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'realm_id',
            { group: ValidatorGroup.CREATE, optional: true },
            createValidator(z.uuid()),
        );

        this.mount(
            'status',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'status_message',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );
    }
}
