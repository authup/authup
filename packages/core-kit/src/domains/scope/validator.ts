/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import type { Scope } from './entity.ts';
import { isScopeNameValid } from './utils.ts';

export class ScopeValidator extends Container<
    Scope
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
                        isScopeNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The scope name is not valid.',
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
            'display_name',
            { optional: true },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'description',
            { optional: true },
            createValidator(z.string().min(5).max(4096).nullable()),
        );

        this.mount(
            'realm_id',
            {
                group: [ValidatorGroup.CREATE, ValidatorGroup.PROVISIONING],
                optional: true,
            },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'built_in',
            {
                group: ValidatorGroup.PROVISIONING,
                optional: true,
            },
            createValidator(z.boolean()),
        );
    }
}
