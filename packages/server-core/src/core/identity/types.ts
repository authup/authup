/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';

export interface IIdentityRepository<
    T extends ObjectLiteral = ObjectLiteral,
> {
    /**
     * Find entity by id with realm.
     *
     * @param id
     */
    findById(id: string) : Promise<T | null>;

    /**
     * Find entity by name with realm.
     *
     * @param name
     * @param realm
     */
    findByName(name: string, realm?: string) : Promise<T | null>;
}
