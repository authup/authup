/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';

export interface IOAuth2ClientRepository {
    /**
     * Find client with realm.
     *
     * @param idOrName
     * @param realmId
     */
    findOneByIdOrName(idOrName: string, realmId?: string) : Promise<Client | null>
}
