/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Client } from '@authup/core-kit';

export function createFakeClient(data: Partial<Client> = {}) {
    return {
        name: faker.internet.username().toLowerCase(),
        displayName: faker.internet.displayName(),
        secret: faker.string.alpha({ length: 10 }),
        redirectUri: 'https://example.com/**',
        authMethod: 'secret',
        tokenBindingMethod: 'none',
        ...data,
    } satisfies Partial<Client>;
}
