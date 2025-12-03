/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';

export interface IUserIdentityRepository {
    findById(id: string) : Promise<User | null>;

    findByName(id: string, realm?: string) : Promise<User | null>;
}
