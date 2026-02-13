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
import type { Realm } from './entity.ts';
import { isRealmNameValid } from './helpers.ts';

export class RealmValidator extends Container<
Realm
> {
    protected initialize() {
        const nameValidator = createValidator(
            zod
                .string()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isRealmNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The realm name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: ValidatorGroup.CREATE }, nameValidator);
        this.mount('name', { group: ValidatorGroup.UPDATE, optional: true }, nameValidator);

        this.mount(
            'display_name',
            { optional: true },
            createValidator(zod.string().min(3).max(256).nullable()),
        );

        this.mount(
            'display_name',
            { optional: true },
            createValidator(zod.string().min(5).max(4096).nullable()),
        );
    }
}
