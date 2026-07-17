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
import type { Policy } from './entity.ts';
import { isPolicyNameValid } from './helpers.ts';

export class PolicyValidator extends Container<
    Policy
> {
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
                        isPolicyNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The policy name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] }, nameValidator);
        this.mount('name', {
            group: ValidatorGroup.UPDATE,
            optional: true,
        }, nameValidator);

        this.mount(
            'displayName',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'invert',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'type',
            { group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING] },
            createValidator(z.string().min(3).max(128)),
        );

        this.mount(
            'parentId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'realmId',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'builtIn',
            {
                group: ValidatorGroup.PROVISIONING,
                optional: true,
            },
            createValidator(z.boolean()),
        );
    }
}
