/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IPolicyRepository extends IEntityRepository<Policy> {
    checkUniqueness(data: Partial<Policy>, existing?: Policy): Promise<void>;

    saveWithEA(entity: Policy, data?: Record<string, any>): Promise<Policy>;

    deleteFromTree(entity: Policy): Promise<void>;
}
