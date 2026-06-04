/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/zod';
import { Container } from 'validup';
import { z } from 'zod';

export class TokenRequestValidator extends Container<{ token: string }> {
    protected initialize() {
        super.initialize();

        this.mount(
            'token',
            createValidator(z.string().min(16).max(2048)),
        );
    }
}
