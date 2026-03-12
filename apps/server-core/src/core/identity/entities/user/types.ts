/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { IdentityProviderMapperElement } from '../../provider/index.ts';

export interface IUserIdentityRepository {
    findOneById(id: string): Promise<User | null>;
    findOneByName(name: string, realm?: string): Promise<User | null>;
    findOneByIdOrName(idOrName: string, realm?: string): Promise<User | null>;
    findOneBy(where: Record<string, any>): Promise<User | null>;

    savePermissions(user: User, items: IdentityProviderMapperElement[]) : Promise<void>;
    saveRoles(user: User, items: IdentityProviderMapperElement[]) : Promise<void>;
    saveOneWithEA(user: Partial<User>, extraAttributes: Record<string, any>) : Promise<User>;
}
