/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME } from '@authup/core-kit';
import { UnauthorizedError } from '@ebec/http';
import type { Request } from 'routup';
import type { RequestIdentity } from '../types';
import { setRequestEnv, useRequestEnv } from './env';

export function useRequestIdentity(req: Request) : RequestIdentity | undefined {
    return useRequestEnv(req, 'identity');
}

export function setRequestIdentity(req: Request, identity: RequestIdentity) : void {
    setRequestEnv(req, 'identity', identity);
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
