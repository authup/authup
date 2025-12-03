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
import { PasswordGrantType } from '../../../../core';
import { UserAuthenticator } from '../../../../services';
import type { IHTTPGrant } from './types';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPGrant {
    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const {
            username,
            password,
            realm_id: realmId,
        } = useRequestBody(req);

        const authenticationService = new UserAuthenticator({
            withLDAP: true,
        });

        const data = await authenticationService.authenticate(username, password, realmId);

        return this.runWith(
            data,
            {
                remote_address: getRequestIP(req, { trustProxy: true }),
            },
        );
    }
}
