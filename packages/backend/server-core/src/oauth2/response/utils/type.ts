/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationResponseType, TokenError } from '@authelion/common';
import { ExpressRequest } from '../../../http';

export function getOauth2AuthorizeResponseTypesByRequest(
    request: ExpressRequest,
) : Record<`${OAuth2AuthorizationResponseType}`, boolean> {
    const data : Record<`${OAuth2AuthorizationResponseType}`, boolean> = {
        [OAuth2AuthorizationResponseType.CODE]: false,
        [OAuth2AuthorizationResponseType.TOKEN]: false,
        [OAuth2AuthorizationResponseType.ID_TOKEN]: false,
        [OAuth2AuthorizationResponseType.NONE]: false,
    };

    const availableResponseTypes : string[] = Object.values(OAuth2AuthorizationResponseType);

    const responseType = request.body.response_type || request.query.response_type;
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
