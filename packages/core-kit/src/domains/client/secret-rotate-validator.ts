/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';
import { ClientSecretMode } from './constants';
import type { ClientSecretRotatePayload } from './types';

export class ClientSecretRotateValidator extends Container<ClientSecretRotatePayload> {
    protected initialize() {
        super.initialize();

        this.mount(
            'secret',
            { optional: true },
            createValidator(z.string().min(3).max(256)),
        );

        this.mount(
            'mode',
            { optional: true },
            createValidator(z.enum(ClientSecretMode)),
        );
    }
}
