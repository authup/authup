/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { OAuth2SubKind } from '@authup/specs';

export class OAuth2IdentityResolverError extends AuthupError {
    static payloadPropertyInvalid(key: string) {
        return new OAuth2IdentityResolverError(`The token payload property ${key} is invalid.`);
    }

    static subKindOneOf() {
        return new OAuth2IdentityResolverError(`Sub kind must be one of: ${Object.values(OAuth2SubKind).join(',')}`);
    }
}
