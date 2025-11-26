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
        name: faker.internet.username(),
        display_name: faker.internet.displayName(),
        secret: faker.string.alpha({ length: 10 }),
        redirect_uri: 'https://example.com/**',
        is_confidential: false,
        ...data,
    } satisfies Partial<Client>;
}
