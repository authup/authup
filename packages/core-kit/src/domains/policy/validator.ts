/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '../../constants.ts';
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
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isPolicyNameValid(ctx.value, {
                            throwOnFailure: true 
                        });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The policy name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', {
            group: ValidatorGroup.CREATE 
        }, nameValidator);
        this.mount('name', {
            group: ValidatorGroup.UPDATE,
            optional: true 
        }, nameValidator);

        this.mount(
            'display_name',
            {
                optional: true 
            },
            createValidator(z.string().min(3).max(256).nullable()),
        );

        this.mount(
            'invert',
            {
                optional: true 
            },
            createValidator(z.boolean()),
        );

        this.mount(
            'type',
            {
                group: ValidatorGroup.CREATE 
            },
            createValidator(z.string().min(3).max(128)),
        );

        this.mount(
            'parent_id',
            {
                optional: true 
            },
            createValidator(z.uuid().nullable()),
        );

        this.mount(
            'realm_id',
            {
                group: ValidatorGroup.CREATE,
                optional: true 
            },
            createValidator(z.uuid().nullable()),
        );
    }
}
