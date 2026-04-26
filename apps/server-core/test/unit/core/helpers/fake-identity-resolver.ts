/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, IdentityType } from '@authup/core-kit';
import type { IIdentityResolver } from '../../../../src/core/identity/resolver/types.ts';

export class FakeIdentityResolver implements IIdentityResolver {
    public resolveCalls: {
        type: `${IdentityType}`; 
        key: string; 
        realmKey?: string 
    }[] = [];

    private identity: Identity | null = null;

    setIdentity(identity: Identity | null) {
        this.identity = identity;
    }

    async resolve(type: `${IdentityType}`, key: string, realmKey?: string): Promise<Identity | null> {
        this.resolveCalls.push({
            type, 
            key, 
            realmKey, 
        });
        return this.identity;
    }
}
