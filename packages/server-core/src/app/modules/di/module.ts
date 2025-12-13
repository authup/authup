/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModuleContextContainer } from '../context';
import type { ApplicationModule } from '../types';
import { registerIdentityDependencyInjections } from './identity';
import { registerLdapDependencyInjections } from './ldap';
import { registerOAuth2DependencyInjections } from './oauth2';

export class DIModule implements ApplicationModule {
    protected container : ModuleContextContainer;

    // ----------------------------------------------------

    constructor(container: ModuleContextContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const config = this.container.require('config');

        registerLdapDependencyInjections();

        registerIdentityDependencyInjections();

        registerOAuth2DependencyInjections({
            tokenAccessMaxAge: config.tokenAccessMaxAge,
            tokenRefreshMaxAge: config.tokenRefreshMaxAge,
            authorizationCodeMaxAge: 60 * 5,
            idTokenMaxAge: config.tokenAccessMaxAge,
            issuer: config.publicUrl,
        });
    }
}
