/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import type { Factory } from 'singa';
import { singa } from 'singa';

const instance = singa<Client>({
    name: 'redis',
});

export function setRedisFactory(factory: Factory<Client>) {
    instance.setFactory(factory);
}

export function isRedisClientUsable() {
    return instance.has() || instance.hasFactory();
}

export function setRedisClient(input: Client) {
    instance.set(input);
}

export function useRedisClient() {
    return instance.use();
}
