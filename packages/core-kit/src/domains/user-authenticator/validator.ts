/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ValidatorGroup } from '@authup/kit';
import { UserAuthenticatorKind } from './constants';
import type { UserAuthenticator } from './entity';

export class UserAuthenticatorValidator extends Container<
    UserAuthenticator
> {
    protected override initialize() {
        super.initialize();

        this.mount(
            'kind',
            { group: ValidatorGroup.CREATE },
            createValidator(z.enum(UserAuthenticatorKind)),
        );

        this.mount(
            'name',
            { optional: true },
            createValidator(z.string().min(1).max(128).nullable()),
        );

        this.mount(
            'user_id',
            {
                group: ValidatorGroup.CREATE,
                optional: true,
            },
            createValidator(z.uuid()),
        );
    }
}
