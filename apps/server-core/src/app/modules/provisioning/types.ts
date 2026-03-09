/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RootProvisioningEntity } from './entities/index.ts';
import type { IDIContainer } from '../../../core';

export interface IProvisioningSource {
    load(container: IDIContainer) : Promise<RootProvisioningEntity>;
}

export interface IProvisioningSynchronizer<T> {
    synchronize(input: T) : Promise<T>;
    synchronizeMany(input: T[]) : Promise<T[]>;
}
