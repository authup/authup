/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { UserValidator } from '@authup/core-kit';
import { Container } from 'validup';

export class RegisterRequestValidator extends Container<User> {
    protected initialize() {
        super.initialize();

        this.mount(new UserValidator({
            pathsToInclude: ['email', 'name', 'password', 'realm_id'],
        }));
    }
}
