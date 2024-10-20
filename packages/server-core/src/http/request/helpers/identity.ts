/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import { UnauthorizedError } from '@ebec/http';
import type { Request } from 'routup';
import { setRequestEnv, useRequestEnv } from 'routup';
import type { RequestIdentity } from '../types';

const sym = Symbol('Identity');

export function useRequestIdentity(req: Request) : RequestIdentity | undefined {
    return useRequestEnv(req, sym) as RequestIdentity | undefined;
}

export function setRequestIdentity(req: Request, identity: RequestIdentity) : void {
    setRequestEnv(req, sym, identity);
}

export function useRequestIdentityOrFail(req: Request) : RequestIdentity {
    const identity = useRequestIdentity(req);
    if (!identity) {
        throw new UnauthorizedError();
    }

    return identity;
}

export function isRequestIdentityMasterRealmMember(input: RequestIdentity) : boolean {
    return input.realmName === REALM_MASTER_NAME;
}
