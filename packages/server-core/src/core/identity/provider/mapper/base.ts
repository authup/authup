/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderAccount, IdentityProviderMappingRelation } from '@authup/core-kit';
import { IdentityProviderMappingSyncMode } from '@authup/core-kit';
import { getJWTClaimByPattern } from '@authup/specs';
import type { IdentityProviderIdentity } from '../types';
import { IdentityProviderMapperOperation } from './constants';
import type { IIdentityProviderMapper, IdentityProviderMapperElement } from './types';

export abstract class IdentityProviderAccountBaseMapper implements IIdentityProviderMapper {
    protected resolve(
        identity: IdentityProviderIdentity,
        mapping: IdentityProviderMappingRelation,
    ) : [IdentityProviderMapperOperation, unknown | undefined] {
        let operation : IdentityProviderMapperOperation;
        if (
            mapping.synchronization_mode === IdentityProviderMappingSyncMode.ONCE &&
            identity.operation === 'updated'
        ) {
            operation = IdentityProviderMapperOperation.NONE;

            return [operation];
        }

        if (!mapping.name || !mapping.value) {
            operation = IdentityProviderMapperOperation.CREATE;

            return [operation];
        }

        const value = getJWTClaimByPattern(
            identity.data,
            mapping.name,
            mapping.value,
            mapping.value_is_regex,
        );

        if (value.length === 0) {
            operation = IdentityProviderMapperOperation.DELETE;
        } else {
            operation = IdentityProviderMapperOperation.CREATE;
        }

        return [operation, value];
    }

    abstract execute(
        identity: IdentityProviderIdentity,
        account: IdentityProviderAccount
    ): Promise<IdentityProviderMapperElement[]>;
}
