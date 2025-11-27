/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { ValidatorGroup } from '../../constants';
import type { Client } from './entity';
import { isClientNameValid } from './helpers';

export class ClientValidator extends Container<Client> {
    protected initialize() {
        super.initialize();

        // ----------------------------------------------

        this.mount(
            'active',
            { optional: true },
            createValidator(zod.boolean()),
        );

        this.mount(
            'is_confidential',
            { optional: true },
            createValidator(zod.boolean()),
        );

        // ----------------------------------------------

        const nameValidator = createValidator(
            zod
                .string()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isClientNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The client name is not valid.',
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
            'display_name',
            { optional: true },
            createValidator(zod.string().min(3).max(256).nullable()),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(zod.string().min(3).max(4096).nullable()),
        );

        // ----------------------------------------------

        this.mount(
            'secret',
            { optional: true },
            createValidator(zod.string().min(3).max(256).nullable()),
        );

        this.mount(
            'secret_encrypted',
            { optional: true },
            createValidator(zod.boolean()),
        );

        this.mount(
            'secret_hashed',
            { optional: true },
            createValidator(zod.boolean()),
        );

        // ----------------------------------------------

        this.mount(
            'redirect_uri',
            { optional: true },
            createValidator(
                zod
                    .string()
                    .check((ctx) => {
                        const validator = zod.url();
                        const urls = ctx.value.split(',');
                        for (let i = 0; i < urls.length; i++) {
                            try {
                                validator.parse(urls[i]);
                            } catch (e) {
                                ctx.issues.push({
                                    input: urls[i],
                                    code: 'custom',
                                    message: e instanceof Error ? e.message : 'The redirect_uri is not valid.',
                                });
                            }
                        }
                    })
                    .nullable(),
            ),
        );

        this.mount(
            'base_url',
            { optional: true },
            createValidator(
                zod.url().nullable(),
            ),
        );

        this.mount(
            'root_url',
            { optional: true },
            createValidator(
                zod.url().nullable(),
            ),
        );

        this.mount(
            'grant_types',
            { optional: true },
            createValidator(zod.string().min(3).max(512).nullable()),
        );

        this.mount(
            'scope',
            { optional: true },
            createValidator(zod.string().min(3).max(512).nullable()),
        );

        // ----------------------------------------------

        this.mount(
            'realm_id',
            { group: ValidatorGroup.CREATE, optional: true },
            createValidator(zod.uuid()),
        );
    }
}
