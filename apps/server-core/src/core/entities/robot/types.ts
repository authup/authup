/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IRobotRepository extends IEntityRepository<Robot> {
    checkUniqueness(data: Partial<Robot>, existing?: Robot): Promise<void>;

    findOneWithSecret(where: Record<string, any>): Promise<Robot | null>;
}
