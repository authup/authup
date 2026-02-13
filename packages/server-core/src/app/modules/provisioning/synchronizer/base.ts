/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IProvisioningSynchronizer } from '../types.ts';

export abstract class BaseProvisioningSynchronizer<T> implements IProvisioningSynchronizer<T> {
    async synchronizeMany(input: T[]): Promise<T[]> {
        const entities : T[] = [];

        for (let i = 0; i < input.length; i++) {
            const entity = await this.synchronize(input[i]);
            entities.push(entity);
        }

        return entities;
    }

    abstract synchronize(input: T): Promise<T>;
}
