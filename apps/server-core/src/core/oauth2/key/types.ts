/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';

export interface IOAuth2KeyRepository {
    /**
     * Find a key for signing and verifying tokens.
     *
     * @param realmId
     */
    findByRealmId(realmId: string) : Promise<Key | null>;

    /**
     * Find a key by explicit id.
     *
     * @param id
     */
    findById(id: string) : Promise<Key | null>;

}
