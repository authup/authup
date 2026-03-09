/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';

export class ActivateRequestValidator extends Container<{ token: string }> {
    protected initialize() {
        super.initialize();

        this.mount(
            'token',
            createValidator(() => {
                const chain = createValidationChain();
                return chain.exists()
                    .notEmpty()
                    .isLength({ min: 3, max: 256 });
            }),
        );
    }
}
