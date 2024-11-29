/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2SubKind, OAuth2TokenGrantResponse, OAuth2TokenPayload,
} from '@authup/security';
import type { Request } from 'routup';

export type TokenIssueResult = {
    token: string,
    payload: OAuth2TokenPayload
};

export type AccessTokenIssueContext = {
    remoteAddress: string,

    sub: string,
    subKind: `${OAuth2SubKind}`,

    realmId: string,
    realmName: string,

    scope?: string,
    clientId?: string,
};

// -----------------------------------------------------

export interface Grant {
    run(request: Request) : Promise<OAuth2TokenGrantResponse>;
}
