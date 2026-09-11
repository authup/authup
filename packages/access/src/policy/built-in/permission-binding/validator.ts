/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { PermissionBindingPolicy } from './types';

export class PermissionBindingPolicyValidator extends Container<PermissionBindingPolicy> {
    override initialize() {
        this.mount(
            'invert',
            createValidator(
                z.boolean()
                    .or(z.null())
                    .or(z.undefined())
                    .optional(),
            ),
        );
    }
}
