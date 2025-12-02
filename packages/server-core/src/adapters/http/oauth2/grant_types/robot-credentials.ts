/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { RobotCredentialsGrant } from '../../../../core';
import { RobotAuthenticationService } from '../../../../services';
import type { IHTTPGrant } from './types';

export class HTTPRobotCredentialsGrant extends RobotCredentialsGrant implements IHTTPGrant {
    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const {
            id,
            secret,
            realm_id: realmId,
        } = useRequestBody(req);

        const authenticationService = new RobotAuthenticationService();
        const entity = await authenticationService.authenticate(id, secret, realmId);

        return this.runWith(
            entity,
            {
                remote_address: getRequestIP(req, { trustProxy: true }),
            },
        );
    }
}
