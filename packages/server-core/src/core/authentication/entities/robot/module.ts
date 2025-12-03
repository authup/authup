/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import { RobotError } from '@authup/core-kit';
import { RobotCredentialsService } from '../../credential';
import { BaseAuthenticator } from '../../base';

export class RobotAuthenticationService extends BaseAuthenticator<Robot> {
    protected credentialsService : RobotCredentialsService;

    constructor() {
        super();

        this.credentialsService = new RobotCredentialsService();
    }

    async authenticate(entity: Robot, secret: string): Promise<Robot> {
        const verified = await this.credentialsService.verify(secret, entity);
        if (!verified) {
            throw RobotError.credentialsInvalid();
        }

        if (!entity.active) {
            throw RobotError.inactive();
        }

        return entity;
    }
}
