/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2IdentityProvider, OAuth2IdentityProviderBase, hasOwnProperty } from '@authup/common';

export function extractOAuth2IdentityProviderProtocolAttributes(
    input: unknown,
) : Partial<OAuth2IdentityProviderBase> {
    if (typeof input !== 'object' || input === null) {
        return {};
    }

    const attributes : (keyof OAuth2IdentityProvider)[] = [
        'token_url',
        'token_revoke_url',
        'authorize_url',
        'user_info_url',
        'scope',
        'client_id',
        'client_secret',
    ];

    const output : Partial<OAuth2IdentityProvider> = {};

    for (let i = 0; i < attributes.length; i++) {
        if (hasOwnProperty(input, attributes[i])) {
            output[attributes[i] as string] = input[attributes[i]];
        }
    }

    return output;
}
