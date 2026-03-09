/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { Container } from 'validup';

export class PasswordForgotRequestValidator extends Container<User> {
    protected initialize() {
        super.initialize();

        const container = new Container({
            oneOf: true,
        });

        container.mount('email', createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isEmail();
        }));

        container.mount(
            'name',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString();
            }),
        );

        this.mount(container);

        this.mount(
            'realm_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain.exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );
    }
}
