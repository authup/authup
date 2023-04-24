/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildIdentityProviderAuthorizeCallbackPath, isObject } from '@authup/core';
import type { OAuth2IdentityProvider } from '@authup/core';
import type { JwtPayload, OAuth2Client } from '@hapic/oauth2';
import type { ConfigInput } from '@hapic/vault';
import type { Request } from 'routup';
import { merge } from 'smob';
import { useConfig } from '../../../config';
import type { IdentityProviderFlowIdentity } from './types';

export abstract class OAuth2IdentityProviderFlow {
    protected client : OAuth2Client;

    protected provider: OAuth2IdentityProvider;

    protected constructor(provider: OAuth2IdentityProvider, config?: ConfigInput) {
        this.provider = provider;

        const clientConfig = merge(config || {}, {
            options: {
                clientId: provider.client_id,
                clientSecret: provider.client_secret,

                redirectUri: `${useConfig().get('publicUrl')}${buildIdentityProviderAuthorizeCallbackPath(provider.id)}`,
            },
        });
    }

    public buildAuthorizeURL() : string {
        return this.client.authorize.buildURL();
    }

    protected extractRolesFromTokenPayload(payload: JwtPayload) : string[] {
        const roles : string[] = [];

        if (Array.isArray(payload.roles)) {
            payload.roles = payload.roles
                .filter((n) => typeof n === 'string');

            if (
                payload.roles &&
                payload.roles.length > 0
            ) {
                roles.push(...payload.roles);
            }
        }

        if (
            isObject(payload.realm_access) &&
            Array.isArray(payload.realm_access.roles)
        ) {
            payload.realm_access.roles = payload.realm_access.roles
                .filter((n) => typeof n === 'string');

            if (
                payload.realm_access.roles &&
                payload.realm_access.roles.length > 0
            ) {
                roles.push(...payload.realm_access.roles);
            }
        }

        return roles;
    }

    abstract getIdentityForRequest(request: Request) : Promise<IdentityProviderFlowIdentity>;
}
