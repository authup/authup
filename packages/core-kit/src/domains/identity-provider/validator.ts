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
import { IdentityProviderProtocol } from './constants';
import type { IdentityProvider } from './entity';
import { IdentityProviderPreset } from './preset';
import { isIdentityProviderNameValid } from './utils';

export class IdentityProviderValidator extends Container<IdentityProvider> {
    protected initialize() {
        super.initialize();

        const nameValidator = createValidator(
            zod.string()
                .min(3)
                .max(128)
                .check((ctx) => {
                    try {
                        isIdentityProviderNameValid(ctx.value, { throwOnFailure: true });
                    } catch (e) {
                        ctx.issues.push({
                            input: ctx.value,
                            code: 'custom',
                            message: e instanceof Error ? e.message : 'The name is not valid.',
                        });
                    }
                }),
        );

        this.mount('name', { group: ValidatorGroup.CREATE }, nameValidator);
        this.mount('name', { group: ValidatorGroup.UPDATE, optional: true }, nameValidator);

        this.mount('display_name', { optional: true }, createValidator(
            zod.string().min(3).max(256),
        ));

        const enabledValidator = createValidator(zod.boolean());
        this.mount('enabled', { group: ValidatorGroup.CREATE }, enabledValidator);
        this.mount('enabled', { group: ValidatorGroup.UPDATE, optional: true }, enabledValidator);

        this.mount(
            'realm_id',
            { group: ValidatorGroup.CREATE, optional: true },
            createValidator(zod.uuid()),
        );

        this.mount('protocol', createValidator(zod.enum(IdentityProviderProtocol)));

        this.mount('preset', { optional: true }, createValidator(zod.enum(IdentityProviderPreset).optional().nullable()));
    }
}
