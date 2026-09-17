/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionPolicyBinding } from '@authup/access';
import type { IAppEvent } from 'routup';

const sym = Symbol('RGrants');

export type RequestGrantsResolver = (identity: IdentityPolicyData) => Promise<PermissionPolicyBinding[]>;

/**
 * The grants `identity` holds for this request. For the request's own subject
 * that is what its token carries (#3597), resolved once; any other subject
 * resolves as itself.
 */
export function useRequestGrants(event: IAppEvent, identity: IdentityPolicyData): Promise<PermissionPolicyBinding[]> {
    const resolve = event.store[sym] as RequestGrantsResolver | undefined;
    if (!resolve) {
        throw new Error('The request grants are not initialised.');
    }

    return resolve(identity);
}

export function setRequestGrantsResolver(event: IAppEvent, resolve: RequestGrantsResolver): void {
    event.store[sym] = resolve;
}
