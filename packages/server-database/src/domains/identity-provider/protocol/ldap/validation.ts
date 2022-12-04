/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapIdentityProvider } from '@authup/common';
import { NotImplementedError } from '@ebec/http';

export function validateLdapIdentityProviderProtocol(
    entity: Partial<LdapIdentityProvider>,
) : LdapIdentityProvider {
    throw new NotImplementedError();
}
