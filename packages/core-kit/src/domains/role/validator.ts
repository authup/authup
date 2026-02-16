/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '../../constants.ts';
import type { Role } from './entity.ts';
import { isRoleNameValid } from './utils.ts';

export class RoleValidator extends Container<
Role
> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(
            z
                .string()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isRoleNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The role name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: ValidatorGroup.CREATE }, nameValidator);
        this.mount('name', { group: ValidatorGroup.UPDATE, optional: true }, nameValidator);

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
            { group: ValidatorGroup.CREATE, optional: true },
            createValidator(z.uuid()),
        );
    }
}
