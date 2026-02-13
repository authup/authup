/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import zod from 'zod';
import { ValidatorGroup } from '../../constants.ts';
import type { Robot } from './entity.ts';
import { isRobotNameValid } from './helpers.ts';

export class RobotValidator extends Container<
Robot
> {
    protected initialize() {
        super.initialize();

        this.mount(
            'secret',
            { optional: true },
            createValidator(zod.string().min(3).max(256).nullable()),
        );

        this.mount(
            'active',
            { optional: true },
            createValidator(zod.boolean()),
        );

        const nameValidator = createValidator(
            zod
                .string()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isRobotNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The robot name is not valid.',
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
            createValidator(zod.string().min(5).max(4096).nullable()),
        );

        this.mount(
            'user_id',
            { optional: true },
            createValidator(zod.uuid()),
        );

        this.mount(
            'realm_id',
            { group: ValidatorGroup.CREATE, optional: true },
            createValidator(zod.uuid()),
        );
    }
}
