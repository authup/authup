/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HeaderError } from '@authup/errors';
import type { AuthorizationHeader } from 'hapic';
import { AuthorizationHeaderType } from 'hapic';
import type { Request } from 'routup';
import { verifyBasicAuthorizationHeader } from './basic';
import { verifyBearerAuthorizationHeader } from './bearer';

export async function verifyAuthorizationHeader(
    request: Request,
    header: AuthorizationHeader,
) : Promise<void> {
    switch (header.type) {
        case AuthorizationHeaderType.BEARER:
            return verifyBearerAuthorizationHeader(request, header);
        case AuthorizationHeaderType.BASIC:
            return verifyBasicAuthorizationHeader(request, header);
    }

    throw HeaderError.unsupportedHeaderType(header.type);
}
