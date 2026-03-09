/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderBaseMapping } from '@authup/core-kit';
import { IdentityProviderMappingSyncMode } from '@authup/core-kit';
import { getJWTClaimByPattern } from '@authup/specs';
import { IdentityProviderIdentityOperation } from '../constants.ts';
import type { IdentityProviderIdentity } from '../types.ts';
import { IdentityProviderMapperOperation } from './constants.ts';
import type { IIdentityProviderMapper, IdentityProviderMapperElement } from './types.ts';

export abstract class IdentityProviderAccountBaseMapper implements IIdentityProviderMapper {
    protected resolve(
        identity: IdentityProviderIdentity,
        mapping: IdentityProviderBaseMapping,
    ) : [IdentityProviderMapperOperation, unknown] | [IdentityProviderMapperOperation] {
        let operation : IdentityProviderMapperOperation;
        if (
            mapping.synchronization_mode === IdentityProviderMappingSyncMode.ONCE &&
            identity.operation === IdentityProviderIdentityOperation.UPDATE
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
        identity: IdentityProviderIdentity
    ): Promise<IdentityProviderMapperElement[]>;
}
