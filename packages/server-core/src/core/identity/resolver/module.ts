/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, ClientIdentity, Identity, Robot, RobotIdentity, User, UserIdentity,
} from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { IIdentityResolver, IdentityResolverContext } from './types';
import type { IClientIdentityRepository, IRobotIdentityRepository, IUserIdentityRepository } from '../entities';

export class IdentityResolver implements IIdentityResolver {
    protected clientRepository: IClientIdentityRepository;

    protected userRepository: IUserIdentityRepository;

    protected robotRepository: IRobotIdentityRepository;

    constructor(ctx: IdentityResolverContext) {
        this.clientRepository = ctx.clientRepository;
        this.userRepository = ctx.userRepository;
        this.robotRepository = ctx.robotRepository;
    }

    async resolve(
        type: `${IdentityType}`,
        key: string,
        realmKey?: string,
    ): Promise<Identity | null> {
        switch (type) {
            case IdentityType.CLIENT: {
                return this.resolveClient(key, realmKey);
            }
            case IdentityType.ROBOT: {
                return this.resolveRobot(key, realmKey);
            }
            case IdentityType.USER: {
                return this.resolveUser(key, realmKey);
            }
        }

        return null;
    }

    private async resolveClient(
        key: string,
        realmKey?: string,
    ) : Promise<ClientIdentity | null> {
        let data : Client | undefined;

        if (isUUID(key)) {
            data = await this.clientRepository.findById(key);
        } else {
            data = await this.clientRepository.findByName(key, realmKey);
        }

        if (data) {
            return { type: IdentityType.CLIENT, data };
        }

        return null;
    }

    private async resolveRobot(
        key: string,
        realmKey?: string,
    ) : Promise<RobotIdentity | null> {
        let data : Robot | undefined;

        if (isUUID(key)) {
            data = await this.robotRepository.findById(key);
        } else {
            data = await this.robotRepository.findByName(key, realmKey);
        }

        if (data) {
            return { type: IdentityType.ROBOT, data };
        }

        return null;
    }

    private async resolveUser(
        key: string,
        realmKey?: string,
    ) : Promise<UserIdentity | null> {
        let data : User | undefined;

        if (isUUID(key)) {
            data = await this.userRepository.findById(key);
        } else {
            data = await this.userRepository.findByName(key, realmKey);
        }

        if (data) {
            return { type: IdentityType.USER, data };
        }

        return null;
    }
}
