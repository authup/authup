/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';

export class TokenRequestValidator extends Container<{ token: string }> {
    protected initialize() {
        super.initialize();

        this.mount('token', createValidator((chain) => chain
            .exists()
            .notEmpty()
            .isString()
            .isLength({ min: 16, max: 2048 })));
    }
}
