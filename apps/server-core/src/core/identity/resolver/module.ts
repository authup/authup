/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
    ClientIdentity,
    Identity,
    User,
    UserIdentity,
} from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { IIdentityResolver, IdentityResolverContext } from './types.ts';
import type { IClientIdentityRepository, IUserIdentityRepository } from '../entities/index.ts';

export class IdentityResolver implements IIdentityResolver {
    protected clientRepository: IClientIdentityRepository;

    protected userRepository: IUserIdentityRepository;

    constructor(ctx: IdentityResolverContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
    }

    /**
     * A CREDENTIAL entry point (password grant, client authentication, Basic):
     * the key is an id or a name. A uuid-shaped key is tried as an id first
     * and, on a miss, as a name: a name may be shaped like a uuid. `realmKey`
     * scopes the name only (an id is globally unique, and the password grant
     * always carries a realm hint through the master fallback).
     */
    async resolve(
        type: `${IdentityType}`,
        key: string,
        realmKey?: string,
    ): Promise<Identity | null> {
        switch (type) {
            case IdentityType.CLIENT: {
                return this.toClientIdentity(await this.clientRepository.findOneByIdOrName(key, realmKey));
            }
            case IdentityType.USER: {
                return this.toUserIdentity(await this.userRepository.findOneByIdOrName(key, realmKey));
            }
        }

        return null;
    }

    /**
     * A token SUBJECT (or another stored reference) is an id and only an id:
     * a subject that no longer exists must never resolve to a namesake.
     */
    async resolveById(
        type: `${IdentityType}`,
        id: string,
    ): Promise<Identity | null> {
        if (!isUUID(id)) {
            return null;
        }

        switch (type) {
            case IdentityType.CLIENT: {
                return this.toClientIdentity(await this.clientRepository.findOneById(id));
            }
            case IdentityType.USER: {
                return this.toUserIdentity(await this.userRepository.findOneById(id));
            }
        }

        return null;
    }

    private toClientIdentity(data: Client | null) : ClientIdentity | null {
        return data ? { type: IdentityType.CLIENT, data } : null;
    }

    private toUserIdentity(data: User | null) : UserIdentity | null {
        return data ? { type: IdentityType.USER, data } : null;
    }
}
