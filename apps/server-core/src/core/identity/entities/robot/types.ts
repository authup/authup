/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';

export interface IRobotIdentityRepository {
    findOneById(id: string): Promise<Robot | null>;
    findOneByName(name: string, realm?: string): Promise<Robot | null>;
    findOneByIdOrName(idOrName: string, realm?: string): Promise<Robot | null>;
    findOneBy(where: Record<string, any>): Promise<Robot | null>;
}
