/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { Robot } from '@authup/core-kit';
import type { ICredentialsAuthenticator } from '../../../../../core/index.ts';
import { RobotCredentialsGrant } from '../../../../../core/index.ts';
import type { HTTPOAuth2RobotCredentialsGrantContext, IHTTPOAuth2Grant } from './types.ts';

export class HTTPRobotCredentialsGrant extends RobotCredentialsGrant implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<Robot>;

    constructor(ctx: HTTPOAuth2RobotCredentialsGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const {
            id,
            secret,
            realm_id: realmId,
        } = body || {};
        const entity = await this.authenticator.authenticate(id, secret, realmId);

        return this.runWith(
            entity,
            {
                ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
                userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
            },
        );
    }
}
