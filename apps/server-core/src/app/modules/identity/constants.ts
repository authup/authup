/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypedToken } from 'eldin';
import type {
    IIdentityPermissionProvider,
    IIdentityProviderAccountManager,
    IIdentityResolver,
    IIdentityRoleProvider,
    IdentityProviderLdapCollectionAuthenticator,
} from '../../../core/index.ts';

export const IdentityInjectionKey = {
    Resolver: new TypedToken<IIdentityResolver>('Resolver'),
    PermissionProvider: new TypedToken<IIdentityPermissionProvider>('IdentityPermissionProvider'),
    RoleProvider: new TypedToken<IIdentityRoleProvider>('IdentityRoleProvider'),
    ProviderAccountManager: new TypedToken<IIdentityProviderAccountManager>('AccountManager'),
    ProviderLdapCollectionAuthenticator: new TypedToken<IdentityProviderLdapCollectionAuthenticator>('ProviderLdapCollectionAuthenticator'),
} as const;
