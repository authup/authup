/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity } from '@authup/core-kit';
import { IdentityType, REALM_MASTER_NAME } from '@authup/core-kit';
import { UnauthorizedError } from '@authup/errors';
import type { IAppEvent } from 'routup';

const sym = Symbol('RIdentity');

export class RequestIdentity {
    public readonly raw : Identity;

    constructor(identity: Identity) {
        this.raw = identity;
    }

    get clientId() {
        const { raw } = this;
        if (raw.type === IdentityType.CLIENT) {
            return raw.data.id;
        }

        return raw.data.client_id || null;
    }

    get data() {
        return this.raw.data;
    }

    get type() {
        return this.raw.type;
    }

    get id() {
        return this.raw.data.id;
    }

    get realmId() {
        return this.raw.data.realm_id || this.raw.data.realm?.id;
    }

    get realmName() {
        return this.raw.data.realm?.name;
    }
}

export function useRequestIdentity(event: IAppEvent) : RequestIdentity | undefined {
    return event.store[sym] as RequestIdentity | undefined;
}

export function setRequestIdentity(event: IAppEvent, input: Identity | RequestIdentity) : void {
    let data : RequestIdentity;

    if (input instanceof RequestIdentity) {
        data = input;
    } else {
        data = new RequestIdentity(input);
    }

    event.store[sym] = data;
}

export function useRequestIdentityOrFail(event: IAppEvent) : RequestIdentity {
    const identity = useRequestIdentity(event);
    if (!identity) {
        throw new UnauthorizedError();
    }

    return identity;
}

export function isRequestIdentityMasterRealmMember(input: RequestIdentity) : boolean {
    return input.realmName === REALM_MASTER_NAME;
}
