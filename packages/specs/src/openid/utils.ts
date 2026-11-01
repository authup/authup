/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import type { OpenIDProviderMetadata } from './type';

export function isOpenIDProviderMetadata(input: unknown) : input is OpenIDProviderMetadata {
    return isObject(input) &&
        typeof input.issuer === 'string' &&
        typeof input.authorization_endpoint === 'string' &&
        typeof input.jwks_uri === 'string' &&
        Array.isArray(input.response_types_supported) &&
        Array.isArray(input.subject_types_supported) &&
        Array.isArray(input.id_token_signing_alg_values_supported) &&
        typeof input.token_endpoint === 'string';
}
