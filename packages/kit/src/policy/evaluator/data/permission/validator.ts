/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-zod';
import type { ContainerOptions } from 'validup';
import { Container } from 'validup';
import { z } from 'zod';
import type { PermissionItem } from '../../../../permission';

export class PolicyDataPermissionValidator extends Container<PermissionItem> {
    constructor(options: ContainerOptions<PermissionItem> = {}) {
        super(options);

        this.mountAll();
    }

    mountAll() {
        this.mount('name', createValidator(z.string().min(3).max(256)));

        this.mount('realm_id', createValidator(z.string().uuid().optional()));

        this.mount('policy', createValidator(z.object({
            type: z.string(),
        }).optional()));
    }
}
