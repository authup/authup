/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Realm } from '@authup/core-kit';

export function createFakeRealm(data: Partial<Realm> = {}) {
    return {
        name: faker.string.alpha({ casing: 'lower', length: 10 }),
        display_name: faker.internet.displayName(),
        description: faker.string.alpha({ length: 256 }),
        ...data,
    } satisfies Partial<Realm>;
}
