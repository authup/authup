/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { IdentityProviderMapperElement } from '../../provider/index.ts';
import type { IEntityRepository } from '../../../entities/index.ts';

export interface IUserIdentityRepository extends IEntityRepository<User> {
    savePermissions(user: User, items: IdentityProviderMapperElement[]) : Promise<void>;

    saveRoles(user: User, items: IdentityProviderMapperElement[]) : Promise<void>;

    saveOneWithEA(user: Partial<User>, extraAttributes: Record<string, any>) : Promise<User>;
}
