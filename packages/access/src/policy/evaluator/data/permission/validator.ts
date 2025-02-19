/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { PermissionItem } from '../../../../permission';

export class PolicyDataPermissionValidator extends Container<PermissionItem> {
    initialize() {
        super.initialize();

        this.mount('name', createValidator(
            z.string()
                .min(3)
                .max(256),
        ));

        this.mount('clientId', createValidator(
            z.string().uuid()
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));

        this.mount('realmId', createValidator(
            z.string().uuid()
                .or(z.null())
                .or(z.undefined())
                .optional(),
        ));

        this.mount('policy', createValidator(z.object({
            type: z.string(),
        }).optional()));
    }
}
