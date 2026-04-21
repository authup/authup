/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import { IdentityProviderMappingSyncMode } from '../identity-provider/constants.ts';
import { ValidatorGroup } from '../../constants.ts';
import type { IdentityProviderRoleMapping } from './entity.ts';

export class IdentityProviderRoleMappingValidator extends Container<
    IdentityProviderRoleMapping
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'provider_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'role_id',
            { group: ValidatorGroup.CREATE },
            createValidator(z.uuid()),
        );

        this.mount(
            'name',
            { optional: true },
            createValidator(z.string().max(64).nullable()),
        );

        this.mount(
            'value',
            { optional: true },
            createValidator(z.string().max(128).nullable()),
        );

        this.mount(
            'value_is_regex',
            { optional: true },
            createValidator(z.boolean()),
        );

        this.mount(
            'synchronization_mode',
            { optional: true },
            createValidator(z.nativeEnum(IdentityProviderMappingSyncMode).nullable()),
        );
    }
}
