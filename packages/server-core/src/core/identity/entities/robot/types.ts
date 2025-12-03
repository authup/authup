/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';

export interface IRobotIdentityRepository {
    findById(id: string) : Promise<Robot | null>;

    findByName(id: string, realm?: string) : Promise<Robot | null>;
}
