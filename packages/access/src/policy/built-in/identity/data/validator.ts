/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';

import type { IdentityPolicyData } from '../types.ts';

export class PolicyIdentityDataValidator extends Container<IdentityPolicyData> {
    initialize() {
        super.initialize();

        this.mount(
            'type',
            createValidator(
                z.string().min(3).max(128),
            ),
        );

        this.mount(
            'id',
            createValidator(
                z.uuid(),
            ),
        );

        this.mount(
            'clientId',
            createValidator(
                z.uuid()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'realmId',
            createValidator(
                z.uuid()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );

        this.mount(
            'realmName',
            createValidator(
                z.string().min(3).max(128)
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );
    }
}
