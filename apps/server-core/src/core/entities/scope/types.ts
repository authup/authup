/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Scope } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IScopeRepository extends IEntityRepository<Scope> {
    checkUniqueness(data: Partial<Scope>, existing?: Scope): Promise<void>;
}
