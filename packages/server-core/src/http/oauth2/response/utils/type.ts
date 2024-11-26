/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/errors';
import { OAuth2AuthorizationResponseType } from '@authup/schema';
import { useRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';

export function getOauth2AuthorizeResponseTypesByRequest(
    request: Request,
) : Record<`${OAuth2AuthorizationResponseType}`, boolean> {
    const data : Record<`${OAuth2AuthorizationResponseType}`, boolean> = {
        [OAuth2AuthorizationResponseType.CODE]: false,
        [OAuth2AuthorizationResponseType.TOKEN]: false,
        [OAuth2AuthorizationResponseType.ID_TOKEN]: false,
        [OAuth2AuthorizationResponseType.NONE]: false,
    };

    const availableResponseTypes : string[] = Object.values(OAuth2AuthorizationResponseType);

    const responseType = useRequestBody(request, 'response_type') ||
        useRequestQuery(request, 'response_type');

    if (typeof responseType !== 'string') {
        throw TokenError.responseTypeUnsupported();
    }

    const responseTypes = responseType.split(' ');
    for (let i = 0; i < responseTypes.length; i++) {
        if (availableResponseTypes.indexOf(responseTypes[i]) === -1) {
            throw TokenError.responseTypeUnsupported();
        } else {
            data[responseTypes[i]] = true;
        }
    }

    return data;
}
