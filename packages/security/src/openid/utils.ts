/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { OAuth2OpenIDProviderMetadata } from './type';

export function isOAuth2OpenIDProviderMetadata(input: unknown) : input is OAuth2OpenIDProviderMetadata {
    if (!isObject(input)) {
        return false;
    }

    if (typeof input.issuer !== 'string') {
        return false;
    }

    if (typeof input.authorization_endpoint !== 'string') {
        return false;
    }

    if (typeof input.jwks_uri !== 'string') {
        return false;
    }

    if (!Array.isArray(input.response_types_supported)) {
        return false;
    }

    if (!Array.isArray(input.subject_types_supported)) {
        return false;
    }

    if (!Array.isArray(input.id_token_signing_alg_values_supported)) {
        return false;
    }

    if (typeof input.token_endpoint !== 'string') {
        return false;
    }

    return true;
}
