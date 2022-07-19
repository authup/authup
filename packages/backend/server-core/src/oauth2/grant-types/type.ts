/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2SubKind, OAuth2TokenResponse,
} from '@authelion/common';
import { ExpressRequest } from '../../http';

export type AccessTokenIssueContext = {
    remoteAddress: string,

    sub: string,
    subKind: `${OAuth2SubKind}`,

    realmId: string,

    scope?: string,
    clientId?: string,
};

// -----------------------------------------------------

export interface Grant {
    run(request: ExpressRequest) : Promise<OAuth2TokenResponse>;
}
