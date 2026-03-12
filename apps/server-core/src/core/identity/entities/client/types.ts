/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';

export interface IClientIdentityRepository {
    findOneById(id: string): Promise<Client | null>;
    findOneByName(name: string, realm?: string): Promise<Client | null>;
    findOneByIdOrName(idOrName: string, realm?: string): Promise<Client | null>;
    findOneBy(where: Record<string, any>): Promise<Client | null>;
}
