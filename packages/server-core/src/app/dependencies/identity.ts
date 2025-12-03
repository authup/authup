/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import {
    ClientIdentityRepository,
    RobotIdentityRepository,
    UserIdentityRepository,
} from '../../adapters/database';
import { IDENTITY_RESOLVER_TOKEN, IdentityResolver } from '../../core';

export function registerIdentityDependencies() {
    const clientRepository = new ClientIdentityRepository();
    const robotRepository = new RobotIdentityRepository();
    const userRepository = new UserIdentityRepository();

    container.register(IDENTITY_RESOLVER_TOKEN, {
        useFactory: () => new IdentityResolver({
            clientRepository,
            robotRepository,
            userRepository,
        }),
    });
}
