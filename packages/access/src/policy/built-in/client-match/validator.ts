/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import type { ClientMatchPolicy } from './types.ts';

export class ClientMatchPolicyValidator extends Container<ClientMatchPolicy> {
    override initialize() {
        super.initialize();

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
