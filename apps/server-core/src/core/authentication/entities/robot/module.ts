/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import { IdentityType, RobotError } from '@authup/core-kit';
import type { IIdentityResolver } from '../../../identity/index.ts';
import { RobotCredentialsService } from '../../credential/index.ts';
import { BaseCredentialsAuthenticator } from '../../base.ts';

export class RobotAuthenticator extends BaseCredentialsAuthenticator<Robot> {
    protected identityResolver : IIdentityResolver;

    protected credentialsService : RobotCredentialsService;

    constructor(identityResolver: IIdentityResolver) {
        super();

        this.identityResolver = identityResolver;
        this.credentialsService = new RobotCredentialsService();
    }

    async authenticate(key: string, secret: string, realmId?: string): Promise<Robot> {
        const identity = await this.identityResolver.resolve(IdentityType.ROBOT, key, realmId);
        if (!identity || identity.type !== IdentityType.ROBOT) {
            throw RobotError.credentialsInvalid();
        }

        const verified = await this.credentialsService.verify(secret, identity.data);
        if (!verified) {
            throw RobotError.credentialsInvalid();
        }

        if (!identity.data.active) {
            throw RobotError.inactive();
        }

        return identity.data;
    }
}
