/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { IdentityGrantType } from '../../../../../core/index.ts';
import { useRequestIdentityOrFail } from '../../../request/index.ts';
import type { IHTTPOAuth2Grant } from './types.ts';

export class HTTPOAuth2IdentityGrantType extends IdentityGrantType implements IHTTPOAuth2Grant {
    runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const identity = useRequestIdentityOrFail(event);

        return this.runWith(
            identity.raw,
            {
                ipAddress: getRequestIP(event) ?? undefined,
                userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
            },
        );
    }
}
