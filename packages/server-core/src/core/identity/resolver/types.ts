/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Identity, IdentityType } from '@authup/core-kit';
import type {
    IClientIdentityRepository,
    IRobotIdentityRepository,
    IUserIdentityRepository,
} from '../entities';

export type IdentityResolverContext = {
    clientRepository: IClientIdentityRepository,
    userRepository: IUserIdentityRepository,
    robotRepository: IRobotIdentityRepository
};

export interface IIdentityResolver {
    resolve(type: `${IdentityType}`, key: string, realmKey?: string) : Promise<Identity | null>
}
