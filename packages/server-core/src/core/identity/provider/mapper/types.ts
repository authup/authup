/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderIdentity } from '../types';
import type { IdentityProviderMapperOperation } from './constants';

export type IdentityProviderMapperElement = {
    key?: string,
    value: unknown,
    realmId?: string,
    operation: IdentityProviderMapperOperation
};

export interface IIdentityProviderMapper {
    execute(
        identity: IdentityProviderIdentity
    ) : Promise<IdentityProviderMapperElement[]>;
}
