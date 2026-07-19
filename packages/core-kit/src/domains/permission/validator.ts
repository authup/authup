/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy, ValidatorGroup  } from '@authup/kit';
import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { Permission } from './entity.ts';
import { isPermissionNameValid } from './helpers.ts';

export class PermissionValidator extends Container<
    Permission
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
                        isPermissionNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The permission name is not valid.',
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
            'description',
            { optional: true },
            createValidator(z.string().min(5).max(4096).nullable()),
        );

        this.mount(
            'clientId',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'realmId',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid().nullable().optional()),
        );

        this.mount(
            'decisionStrategy',
            { optional: true },
            createValidator(
                z.enum(DecisionStrategy)
                    .nullable(),
            ),
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
