/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import type { Path } from '@authup/core-kit';

export function createFakePath(data: Partial<Path> = {}) {
    return {
        name: faker.string.alpha({
            casing: 'lower',
            length: 8,
        }),
        displayName: faker.internet.displayName(),
        description: faker.string.alpha({ length: 256 }),
        ...data,
    } satisfies Partial<Path>;
}
