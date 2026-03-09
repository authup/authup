/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../types.ts';
import type { IdentityProviderMapperOperation } from './constants.ts';

export type IdentityProviderMapperElement = {
    key?: string,
    value: unknown,
    realmId?: string | null,
    operation: IdentityProviderMapperOperation
};

export interface IIdentityProviderMapper {
    execute(
        identity: IdentityProviderIdentity
    ) : Promise<IdentityProviderMapperElement[]>;
}
