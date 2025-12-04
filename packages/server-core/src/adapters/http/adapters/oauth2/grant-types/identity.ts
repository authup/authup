/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { IdentityGrantType } from '../../../../../core';
import { useRequestIdentityOrFail } from '../../../request';
import type { IHTTPGrant } from './types';

export class HTTPOAuth2IdentityGrantType extends IdentityGrantType implements IHTTPGrant {
    runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const identity = useRequestIdentityOrFail(req);

        return this.runWith(
            identity.raw,
            {
                remote_address: getRequestIP(req, { trustProxy: true }),
            },
        );
    }
}
