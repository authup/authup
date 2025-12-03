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
import { IdentityType, UserError } from '@authup/core-kit';
import {
    type IIdentityResolver,
    RobotAuthenticator,
    RobotCredentialsGrant,
} from '../../../../core';
import type { HTTPOAuth2RobotCredentialsGrantContext, IHTTPGrant } from './types';

export class HTTPRobotCredentialsGrant extends RobotCredentialsGrant implements IHTTPGrant {
    protected authenticator : RobotAuthenticator;

    protected identityResolver: IIdentityResolver;

    constructor(ctx: HTTPOAuth2RobotCredentialsGrantContext) {
        super(ctx);

        this.authenticator = new RobotAuthenticator();
        this.identityResolver = ctx.identityResolver;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const {
            id,
            secret,
            realm_id: realmId,
        } = useRequestBody(req);

        const identity = await this.identityResolver.resolve(
            IdentityType.ROBOT,
            id,
            realmId,
        );

        if (!identity || identity.type !== IdentityType.ROBOT) {
            throw UserError.credentialsInvalid();
        }

        const entity = await this.authenticator.authenticate(identity.data, secret);

        return this.runWith(
            entity,
            {
                remote_address: getRequestIP(req, { trustProxy: true }),
            },
        );
    }
}
