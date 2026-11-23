/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Identity, IdentityType } from '@authup/core-kit';
import type {
    IClientIdentityRepository,
    IUserIdentityRepository,
} from '../entities/index.ts';

export type IdentityResolverContext = {
    clientRepository: IClientIdentityRepository,
    userRepository: IUserIdentityRepository
};

export interface IIdentityResolver {
    /**
     * A credential entry point: an id or a name, the name scoped by `realmKey`.
     */
    resolve(type: `${IdentityType}`, key: string, realmKey?: string) : Promise<Identity | null>

    /**
     * A token subject or another stored reference: by id only, never a name.
     */
    resolveById(type: `${IdentityType}`, id: string) : Promise<Identity | null>
}
