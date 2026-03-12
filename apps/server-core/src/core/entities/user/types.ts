/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IUserRepository extends IEntityRepository<User> {
    checkUniqueness(data: Partial<User>, existing?: User): Promise<void>;

    findOne(id: string, query?: Record<string, any>, realm?: string): Promise<User | null>;
}
