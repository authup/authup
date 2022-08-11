/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapIdentityProvider } from '@authelion/common';
import { NotImplementedError } from '@typescript-error/http';

export function validateLdapIdentityProviderProtocol(
    entity: Partial<LdapIdentityProvider>,
) : LdapIdentityProvider {
    throw new NotImplementedError();
}
